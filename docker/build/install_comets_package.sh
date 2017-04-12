#!/bin/bash

COMETS_DIR=/deploy/app/restricted/rcode
COMETS_INSTALL_LOG=/deploy/logs/update_comets_package.log

R -q -e "devtools::document('$COMETS_DIR', roclets=c('rd', 'collate', 'namespace'))" >> $COMETS_INSTALL_LOG
R CMD INSTALL $COMETS_DIR --no-html >> $COMETS_INSTALL_LOG  2>&1

sleep 1
