# This dockerfile expects the comets analytics package to be mounted as /deploy/CometsAnalyticsPackage.tar.gz. 
# The container will install the package at runtime and then run the application 
#
# For example:
# docker run -d \
#  -p 8100:8000 \
#  -v /local/content/apps/comets:/deploy/app \
#  -v /local/content/logs/comets:/deploy/logs \
#  -v /local/content/apps/comets/rcode/package:/deploy/app/rcode/package \
#  cbiitss:comets-dev
# 
# This image has the same dependencies as the comets.dockerfile image:
# docker build -t cbiitss:comets-dev -f comets-dev.dockerfile .


FROM cbiitss:r-base

RUN adduser -u 4004 ncianalysis

RUN mkdir -p /deploy \
 && touch /deploy/CometsAnalyticsPackage.tar.gz \
 && chown -R ncianalysis:ncianalysis /deploy

USER ncianalysis
WORKDIR /deploy

RUN echo " \n\
cd /deploy/app/rcode/package
R -e "devtools::document()" \n\
R CMD INSTALL . \n\
mod_wsgi-express start-server app/deploy.wsgi --port 8000 --user ncianalysis --group ncianalysis --server-root wsgi --document-root app --working-directory app --directory-index index.html --log-directory logs --rotate-logs \n\
" >> /deploy/run.sh

RUN chmod 755 /deploy/run.sh

ENTRYPOINT ["/deploy/run.sh"]
