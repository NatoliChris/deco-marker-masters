/* eslint-disable no-undef */

function getElement(id) { return document.getElementById(id); }

const iframe = getElement('iframe');
const container = getElement('iframe-container');
const code = getElement('code');
const sketch = getElement('iframe-container');
const markingDialog = getElement('markingDialog');
// const buttonPrev = getElement('btn-prev');
const buttonPlay = getElement('btn-play');
const buttonStop = getElement('btn-stop');
const buttonMark = getElement('btn-mark');
const buttonFull = getElement('btn-full');
const buttonHome = getElement('btn-home');

const sid = parseInt(getElement('sid').innerHTML)

console.log(sid)

const markA = getElement('markA');
const markB = getElement('markB');
const markC = getElement('markC');

const gradeA = getElement('gradeA');
const gradeB = getElement('gradeB');
const gradeC = getElement('gradeC');

const commentA = getElement('commentA');
const commentB = getElement('commentB');
const commentC = getElement('commentC');

const daysLate = getElement('mark-late');
const override = getElement('override');
const finalMark = getElement('mark-final');

const submit = getElement('submit');
const message = getElement('message');

const commentPreview = getElement('commentPreview');

const gradeThresholds = {
    HD: 85,
    DI: 75,
    CR: 65,
    PS: 50,
    FA: 0
}

// EDIT ME!
// =============

const templates = {
    A: {
        HD: "For Criteria A, Complex and self-authored demonstrates a strong comprehension of programming concepts covered in this class.",
        DI: "For Criteria A, Your original and self-authored code demonstrates a considered ability to comprehend, modify and integrate code.",
        CR: "For Criteria A, You have demonstrated an ability author and integrate code with sufficient comprehension of programming concepts covered in this class.",
        PS: "For Criteria A, Work demonstrates an ability to comprehend original code through the use of modified, integrated programming concepts covered in this class.",
        FA: "For Criteria A, Sumbitted code has not demonstrated an ability to author original code and/or the ability comprehend, modify or integrate code has not been demonstrated."
    },
    B: {
        HD: "For Criteria B, Strong interaction, layout and visual design to the level of professional standards.",
        DI: "For Criteria B, Well-considered interaction, layout and visual design.",
        CR: "For Criteria B, Mostly clear and adequately considered interaction, layout and visual design.",
        PS: "For Criteria B, Satisfying interaction design, layout and visual.",
        FA: "For Criteria B, Unclear, inadequate interaction, layout and visual design."
    },
    C: {
        HD: "For Criteria C, Excellent demonstration and solid understanding of the topics taught in the unit and clearly documented project that matches professional standards. Presented in an attractive and aesthetically pleasing format to an exceptional level of quality.",
        DI: "For Criteria C, Thorough demonstration and solid understanding of the topics taught in the unit and clearly documented project. Presented in an attractive and aesthetically pleasing format to a high-level of quality.",
        CR: "For Criteria C, Satisfying demonstration and understanding of the topics taught in the unit and well-documented project. Presented in an attractive and aesthetically pleasing format at a good level of quality.",
        PS: "For Criteria C, Some demonstration and understanding of the topics taught in the unit and mostly well-documented project. Presented in an attractive and aesthetically pleasing format at a satisfactory level of quality.",
        FA: "For Criteria C, Inadequate demonstration and understanding of the topics taught in the unit and missing and confusing project documentation. Poorly presented and formatted."
    }
}

// =============

function htmlEscape(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}


let markingDialogShown = false;

// Refresh the display and code window
function updateDisplay() {
    iframe.width = container.width - 20;
    iframe.height = container.height - 20;

    // This just works
    iframe.contentWindow.location.href = '/index.html'
    
    // Set style of iframe stuff (to remove scrollbars)
    iframe.contentDocument.body.style.margin = 0;
    iframe.contentDocument.body.style.display = 'flex';
    iframe.contentDocument.body.style.justifyContent = 'center';
    iframe.contentDocument.body.style.alignItems = 'center';

    // Get the code from the server
    const xhttp = new XMLHttpRequest();

    xhttp.open('GET', '/mySketch.js', true);
    xhttp.send();
    xhttp.onreadystatechange = function() {
        if (this.readyState === 4 && this.status === 200) {
            code.innerHTML = htmlEscape(this.responseText);
            // Re-style the code
            code.classList.remove('prettyprinted');
            PR.prettyPrint(code);
        }
    }
}

function home() {
    window.location.href = '/';
}

function play() {
    updateDisplay();
}

function stop() {
    iframe.srcdoc = '<style>body {background-color: #eeeeee;}</style><body></body>';
}

function mark() {
    if (markingDialogShown) {
        markingDialogShown = false;
        markingDialog.style.opacity = 0;
        setTimeout(() => markingDialog.style.visibility = "hidden", 100);
    } else {
        markingDialogShown = true;
        markingDialog.style.visibility = "visible";
        markingDialog.style.opacity = 1;
    }
}

function full() {
    iframe.requestFullscreen();
}

function getLateWords() {
    let d;
    if (daysLate && override) d = override.checked ? 0 : daysLate.value;
    if (d) {
        return `${d} day${d === '1' ? '' : 's'} late (-${d * 5}%)`;
    }
    return ''
}

function updatePreview() {
    commentPreview.value = [commentA.value, commentB.value, commentC.value, getLateWords()]
        .filter(x => x.trim() !== "")
        .join('\n\n')
        .trim();
}

function calculateMarks() {
    let num = Math.round(parseInt(markA.value, 10) + parseInt(markB.value, 10) + parseInt(markC.value, 10))
    if (daysLate && override) num -= override.checked ? 0 : 15 * daysLate.value;

    if (num < 0) num = 0;
    if (num > 300) num = 300;
    return num;
}

function updateMarks() {
    const num = calculateMarks();
    if (!isNaN(num)) finalMark.innerHTML = num;
}

function sendToServer(sid, rubric, comment, grade) {
    const xhttp = new XMLHttpRequest();

    xhttp.open("POST", "/grade", true)
    xhttp.setRequestHeader("Content-Type", `application/json`);
    xhttp.send(JSON.stringify({
        sid: sid,
        rubric: rubric,
        comment: comment,
        mark: grade
    }));
    console.log("sent");
    message.innerHTML='Saved';
}

// Alex: 450157028

// Daisuke
function sendMarkToCanvas() {
    console.log("sending...");
    message.innerHTML='Submitting';
    console.log(markA.value)
    console.log(markB.value)
    console.log(markC.value)
    sendToServer(
        sid,
        {
            A: parseInt(markA.value),
            B: parseInt(markB.value),
            C: parseInt(markC.value)
        },
        commentPreview.value,
        finalMark.innerHTML
    );
}


window.onLoad = () => {
    sketch.onmouseup = () => updateDisplay();
    iframe.onfullscreenchange = () => iframe.contentWindow.location.reload();

    // What a hack lmao
    [gradeA, gradeB, gradeC].forEach(e => {
        e.onchange = function() {
            const type = this.id[this.id.length - 1];
            this.style.backgroundColor = getComputedStyle(this.children[this.selectedIndex]).backgroundColor;
            getElement('mark' + type).value = gradeThresholds[this.value];
            getElement('comment' + type).value = templates[type][this.value];
            updatePreview();
            updateMarks();
        }
    });

    [commentA, commentB, commentC].forEach(e => {
        e.oninput = updatePreview;
    });

    [markA, markB, markC].forEach(e => {
        e.oninput = updateMarks;
    });
    [daysLate, override].forEach(e => {
        if (e) e.oninput = _ => {
            updateMarks();
            updatePreview();
        };
    });

    // buttonPrev.onclick = prev;
    buttonPlay.onclick = play;
    buttonStop.onclick = stop;
    buttonMark.onclick = mark;
    buttonFull.onclick = full;
    buttonHome.onclick = home;
    // buttonNext.onclick = next;
    submit.onclick = sendMarkToCanvas;
    updateDisplay();
}
