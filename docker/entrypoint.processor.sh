#!/bin/bash

# remove lock
rm -rf /usr/lib64/R/library/00LOCK-rcode

# install comets package if directory does not exist
[[ ! -d /usr/lib64/R/library/COMETS ]] && install_comets_package.sh "/deploy/logs/update_comets_package_processor.log"

# create ncianalyis user
useradd -u 4004 ncianalysis

# change ownership of deployment directory
chown -R ncianalysis:ncianalysis /deploy

# change ownership of deployment directory
chown -R ncianalysis:ncianalysis /deploy

# start python development server with specified filename
# if not specified, use default Consumer.py
su ncianalysis
pushd /deploy/app
python ${1:-"process/Consumer.py"}
