#!/bin/bash

# web application container image
docker build -t cbiitss/comets:base0 -f comets.base.dockerfile .

# request processor image
docker build -t cbiitss/comets:processor -f comets.processor.dockerfile .

# images for development on Docker for Windows
# docker build -t cbiitss/comets:base0.devel -f comets.base.devel.dockerfile .
# docker build -t cbiitss/comets:processor.devel -f comets.processor.devel.dockerfile .

