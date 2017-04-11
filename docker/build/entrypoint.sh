#!/bin/bash

# install comets package
pushd /deploy/app/restricted/rcode
R -e "devtools::document()"
R CMD INSTALL .
popd

# start wsgi server
mod_wsgi-express start-server /deploy/app/deploy.wsgi \
  --port 8000 \
  --user ncianalysis \
  --group ncianalysis \
  --server-root wsgi \
  --document-root app \
  --working-directory app \
  --directory-index index.html \
  --log-directory logs \
  --socket-timeout 900 \
  --queue-timeout 900 \
  --shutdown-timeout 900 \
  --graceful-timeout 900 \
  --connect-timeout 900 \
  --request-timeout 900 \
  --reload-on-changes \
  --processes 3 \
  --threads 1 \
  --rotate-logs
