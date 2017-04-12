#!/bin/bash

docker-compose -f comets.compose pull comets
docker-compose -f comets.compose pull processor
docker-compose -f comets.compose pull activemq

docker-compose -f comets.devel.compose pull comets
docker-compose -f comets.devel.compose pull processor
docker-compose -f comets.devel.compose pull activemq
