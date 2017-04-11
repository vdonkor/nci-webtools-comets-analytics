#!/bin/bash


## create directories
rm -rf .tmp
mkdir -p .tmp app logs

git clone -b docker-configuration https://github.com/CBIIT/nci-webtools-comets-analytics .tmp/repo
cp -r .tmp/repo/comets/* ./app/

git clone https://github.com/CBIIT/R-cometsAnalytics .tmp/package
mkdir -p app/restricted/rcode
cp -r .tmp/package/* ./app/restricted/rcode/

