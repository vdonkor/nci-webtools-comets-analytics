#!/bin/bash

# web application container image
docker build -t cbiitss/comets:base0 -t cbiitss/comets -f comets.base.dockerfile .

# request processor image
docker build -t cbiitss/comets:processor -f comets.processor.dockerfile .

# dev image
docker build -t cbiitss/comets:dev -f comets.dev.dockerfile .
