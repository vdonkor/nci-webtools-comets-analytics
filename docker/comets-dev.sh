# This dockerfile expects the comets analytics package to be mounted to the /

FROM cbiitss:r-base

RUN adduser -u 4004 ncianalysis

RUN mkdir -p /deploy \
 && touch /deploy/CometsAnalyticsPackage.tar.gz \
 && chown -R ncianalysis:ncianalysis /deploy

USER ncianalysis
WORKDIR /deploy

RUN 

RUN echo 

RUN echo " \n\
R -e "install.packages('/deploy/CometsAnalyticsPackage.tar.gz', repos=NULL) \n\
mod_wsgi-express start-server app/deploy.wsgi --port 8000 --user ncianalysis --group ncianalysis --server-root wsgi --document-root app --working-directory app --directory-index index.html --log-directory logs --rotate-logs \n\
" >> /deploy/run.sh

RUN chmod 755 /deploy/run.sh

ENTRYPOINT ["/deploy/run.sh"]
