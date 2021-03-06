#!/bin/bash

# remove wsgi directory
rm -rf /deploy/wsgi

# create additional configuration directives for apache
mkdir -p /deploy/wsgi

# Additional configuration directives
cat << EOF > /deploy/wsgi/additional-configuration.conf
# Do not serve certain filetypes
<FilesMatch "\.(conf|db|ini|py|wsgi|xml|R|r|md|yml|log)$">
  Require all denied
</FilesMatch>
# Workaround for process timeout
WSGIApplicationGroup %{GLOBAL}
EOF

# remove lock
rm -rf /usr/lib64/R/library/00LOCK-rcode

# install comets package if directory does not exist
[[ ! -d /usr/lib64/R/library/COMETS ]] && install_comets_package.sh

# create ncianalyis user
useradd -u 4004 ncianalysis

# change ownership of deployment directory
chown -R ncianalysis:ncianalysis /deploy

# start wsgi server
pushd /deploy
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
  --limit-request-body 2147483647 \
  --processes 2 \
  --threads 4 \
  --rotate-logs \
  --log-level info \
  --error-log-name comets_log \
  --include-file wsgi/additional-configuration.conf
