#!/bin/bash

docker build -t cbiitss/comets:base0 -f comets.base.dockerfile .
docker build -t cbiitss/comets:processor -f comets.processor.dockerfile .

docker build -t cbiitss/comets:base0.devel -f comets.base.devel.dockerfile .
docker build -t cbiitss/comets:processor.devel -f comets.processor.devel.dockerfile .

