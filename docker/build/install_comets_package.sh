#!/bin/bash

pushd /deploy/app/restricted/rcode
R -e "devtools::document()"
R CMD INSTALL .
popd
