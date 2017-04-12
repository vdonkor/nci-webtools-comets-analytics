#!/bin/bash

# install comets package if directory does not exist
[[ ! -d /usr/lib64/R/library/COMETS ]] && install_comets_package.sh

# change ownership of deployment directory
chown -R ncianalysis:ncianalysis /deploy

# start python development server
pushd /deploy/app
python RequestProcessor.py
