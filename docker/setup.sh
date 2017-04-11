#!/bin/bash

## create directories
rm -rf run/.tmp
mkdir -p run/.tmp run/app run/logs

git clone -b docker-configuration https://github.com/CBIIT/nci-webtools-comets-analytics run/.tmp/repo
cp -r .tmp/repo/comets/* run/app/

git clone https://github.com/CBIIT/R-cometsAnalytics run/.tmp/package
mkdir -p app/restricted/rcode
cp -r .tmp/package/* run/app/restricted/rcode/
