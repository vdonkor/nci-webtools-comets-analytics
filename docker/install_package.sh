#!/bin/bash

docker exec --user root comets bash -c 'R CMD INSTALL /deploy/app/restricted/rcode'
sleep 5
docker restart comets
