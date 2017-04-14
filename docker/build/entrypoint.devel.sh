#!/bin/bash

# remove lock
rm -f /usr/lib64/R/library/00LOCK-rcode


# install comets package if directory does not exist
[[ ! -d /usr/lib64/R/library/COMETS ]] && install_comets_package.sh

# start python development server
pushd /deploy/app
python comets.py --debug --port 8000
