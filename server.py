from flask import Flask, request, render_template, url_for, send_file, abort, make_response
import requests as req
from pprint import pprint
from urllib.parse import quote
import os
import re

app = Flask(__name__)

current_user = ''

users = {}

#  BASE_URL = 'https://sydney.test.instructure.com/api/v1'
BASE_URL = 'https://canvas.sydney.edu.au/api/v1'

EXTRACT_URL = "extracted_idea"

COURSE = 18127
ASSIGNMENT = 141421

# CRITERIA = [ '_8700', '_5444', '_2163' ]
CRITERIA = ['_8700', '_5444']

sids = []

with open('token') as f:
    TOKEN = f.read().strip()


HEADERS = {
    'Authorization': 'Bearer ' + TOKEN,
    'Content-Type': 'multipart/form-data'
}


def nocache(s):
    resp = make_response(s)
    resp.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    resp.headers['Pragma'] = 'no-cache'
    resp.headers['Expires'] = '0'
    return resp


@app.route('/grade', methods=['POST'])
def grade():
    json = request.get_json()
    send_assignment(json['sid'], json['rubric'], json['comment'], json['mark'])
    return nocache("{}")


@app.route('/<int:sid>')
def view(sid):
    global current_user
    current_user = users[sid]

    return render_template('view.html',
                           sid=current_user['sid'],
                           unikey=current_user['unikey'],
                           name=current_user['name'],
                           late=current_user['late'],
                           user_key=sid)


@app.route('/pdf/<int:user_id>')
def view_pdf(user_id):
    """
    Returns the PDF to view in a new window.

    :param sid - The ``id`` of the student used in the `user` dict.

    :returns the PDF file in the assignment.
    """
    current = users[user_id]

    # Find the pdf in the directory
    filedir = "{}/{}".format(EXTRACT_URL, current['latest_submission'])

    # Filter --> list --> should only evaluate to 1 pdf.
    pdf_file = list(filter(lambda f: f.endswith(('.pdf', '.PDF')), list(os.listdir(filedir))))

    # Return the file to read.
    return nocache(send_file("{}/{}/{}".format(EXTRACT_URL, current['latest_submission'], pdf_file[0])))


@app.route('/mySketch.js')
def get_sketch():
    if current_user['latest_submission'] is None:
        return ""
    if os.path.exists(f"extracted_idea/{current_user['latest_submission']}/mySketch.js"):
        return nocache(send_file(f"extracted_idea/{current_user['latest_submission']}/mySketch.js"))
    else:
        return nocache(send_file(f"extracted_idea/{current_user['latest_submission']}/sketch.js"))


@app.route('/index.html')
def extracted_idea_index():
    print("boop")
    return nocache(send_file(f"fixed_index.html"))


@app.route('/<path:path>')
def static_proxy(path):
    if path != 'favicon.ico':
        if current_user['latest_submission'] is None:
            return ""
        return nocache(send_file(f"extracted_idea/{current_user['latest_submission']}/{path}"))
    abort(404)


@app.route('/')
def index():
    return nocache(render_template(
        'index.html',
        student_ids=sorted(list(users.keys()), key=lambda x: users[x]['unikey']),
        students=users))


def send_assignment(sid, rubric, comment, mark):
    print(sid, rubric, comment, mark)
    comment = quote(comment)
    print("Sending to",
          f'{BASE_URL}/courses/{COURSE}/assignments/{ASSIGNMENT}/submissions/sis_user_id:{sid}')
    r = req.put(
        f'{BASE_URL}/courses/{COURSE}/assignments/{ASSIGNMENT}/submissions/sis_user_id:{sid}',
        data=(f'submission[posted_grade]={mark}'
              f'&comment[text_comment]={comment}'
              f'&rubric_assessment[{CRITERIA[0]}][points]={rubric["A"]}'
              f'&rubric_assessment[{CRITERIA[1]}][points]={rubric["B"]}'),
        headers=HEADERS).json()
    print(mark, rubric["A"], rubric["B"])
    if mark != rubric["A"] + rubric["B"]:


            #   f'&rubric_assessment[{CRITERIA[2]}][points]={rubric["C"]}'),

    # print(mark, rubric["A"], rubric["B"])
    # if mark != rubric["A"] + rubric["B"]:
        r = req.put(
            f'{BASE_URL}/courses/{COURSE}/assignments/{ASSIGNMENT}/submissions/sis_user_id:{sid}',
            data=(f'submission[posted_grade]={mark}'),
            headers=HEADERS).json()


def get_user_id(filename):
    match = re.match(r'^\w+?_(late_)?(\d+)_(\d+).+$', filename)
    if match:
        return int(match.group(2))

    match = re.match(r'^\w+?_(late_)?(\d+)_text.+$', filename)
    if match:
        return int(match.group(2))


def get_submission_id(filename):
    match = re.match(r'^\w+?_(late_)?(\d+)_(\d+).+$', filename)
    if match:
        return int(match.group(3))
    return 0


def get_sketch_path(filename):
    if not os.path.isdir(f'extracted_idea/{filename}'):
        return ''
    if 'index.html' in os.listdir(f'extracted_idea/{filename}'):
        return filename
    for f in os.listdir(f'extracted_idea/{filename}'):
        if not os.path.isdir(f'extracted_idea/{filename}/{f}'):
            continue
        if 'index.html' in os.listdir(f'extracted_idea/{filename}/{f}'):
            return f'{filename}/{f}'
        for s in os.listdir(f'extracted_idea/{filename}/{f}'):
            if not os.path.isdir(f'extracted_idea/{filename}/{f}/{s}'):
                continue
            if 'index.html' in os.listdir(f'extracted_idea/{filename}/{f}/{s}'):
                return f'{filename}/{f}/{s}'
    return ''


def get_users():
    with open('users_idea.txt') as f:
        users = [x.strip().split('|') for x in f.read().strip().split('\n')]
        users = [(int(u[0]), int(u[1]), u[2], u[3]) for u in users]
        return users


if __name__ == '__main__':
    files = os.listdir('extracted_idea/')
    ids = {get_user_id(f): {} for f in files}
    if os.path.exists('sids_idea.txt'):
        with open('sids_idea.txt') as f:
            sids = f.readlines()
            sids = [int(x.strip()) for x in sids if x]
    for f in files:
        ids[get_user_id(f)][get_submission_id(f)] = get_sketch_path(f)
    for user in get_users():
        if sids and int(user[1]) not in sids:
            continue
        if user[0] in ids:
            users[user[0]] = {
                'name': user[3],
                'unikey': user[2],
                'submissions': ids[user[0]],
                'latest_submission': ids[user[0]][max([x for x in ids[user[0]]])],
                'sid': int(user[1]),
            }
            users[user[0]]['late'] = ('_late_' in users[user[0]]['latest_submission'])
        else:
            users[user[0]] = {
                'name': user[3],
                'unikey': user[2],
                'submissions': None,
                'latest_submission': None,
                'sid': int(user[1]),
            }
    print(len(users))
    app.run(ssl_context='adhoc')
    # app.run(ssl_context='adhoc', host="0.0.0.0")
