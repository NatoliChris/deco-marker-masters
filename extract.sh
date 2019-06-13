#!/bin/zsh
mkdir zips_idea
unzip submissions_idea.zip -d zips_idea

mkdir extracted_idea

for f in zips_idea/*.zip; do
    mkdir "extracted_idea/$f:t:r"
    unzip $f -d "extracted_idea/$f:t:r"
done

mkdir -p pdfs_idea
mv zips_idea/*.pdf pdfs_idea
