#!/bin/bash

# remove lock
rm -f /usr/lib64/R/library/00LOCK-rcode


# install comets package if directory does not exist
[[ ! -d /usr/lib64/R/library/COMETS ]] && install_comets_package.sh

# change ownership of deployment directory
chown -R ncianalysis:ncianalysis /deploy

# start python development server with specified filename
# if not specified, use default RequestProcessor.py
pushd /deploy/app
python ${1:RequestProcessor.py}