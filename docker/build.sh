#!/bin/bash

# web application
docker build -t cbiitss/comets:base0 -t cbiitss/comets -f comets.base.dockerfile .

# request processor
docker build -t cbiitss/comets:processor -f comets.processor.dockerfile .

# local development
docker build -t cbiitss/comets:dev -f comets.dev.dockerfile .
