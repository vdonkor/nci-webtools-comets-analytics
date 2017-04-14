#!/bin/bash

# remove lock
rm -rf /usr/lib64/R/library/00LOCK-rcode

# install comets package if directory does not exist
[[ ! -d /usr/lib64/R/library/COMETS ]] && install_comets_package.sh

# change ownership of deployment directory
rm -rf /deploy/logs/comets_processor.log
touch /deploy/logs/comets_processor.log
chown -R ncianalysis:ncianalysis /deploy

# start python development server with specified filename
# if not specified, use default RequestProcessor.py
pushd /deploy/app
python ${1:RequestProcessor.py} > /deploy/logs/comets_processor.log  2>&1
