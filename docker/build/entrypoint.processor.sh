#!/bin/bash

# install comets package
pushd /deploy/app/restricted/rcode
R -e "devtools::document()"
R CMD INSTALL .
popd

# start python development server
pushd /deploy/app
python RequestProcessor.py
