#!/bin/bash

# install comets package if directory does not exist
[[ ! -d /usr/lib64/R/library ]] && install_comets_package.sh

# start python development server
pushd /deploy/app
python RequestProcessor.py
