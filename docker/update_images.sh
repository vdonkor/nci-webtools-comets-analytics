#!/bin/bash

docker-compose -f comets.compose pull comets comets_processor activemq
docker-compose -f comets.devel.compose pull comets comets_processor activemq
