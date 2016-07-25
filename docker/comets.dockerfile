FROM cbiitss:r-base

COPY CometsAnalyticsPackage.tar.gz /tmp/

RUN R -e "install.packages(c('/tmp/CometsAnalyticsPackage.tar.gz', repos=NULL))"

RUN adduser -u 4004 ncianalysis

RUN mkdir -p /deploy \
 && chown -R ncianalysis:ncianalysis /deploy

USER ncianalysis
WORKDIR /deploy

ENTRYPOINT ["mod_wsgi-express"]
CMD ["start-server", "app/deploy.wsgi", \
  "--port", "8000", \
  "--user", "ncianalysis", \
  "--group", "ncianalysis", \
  "--server-root", "wsgi", \
  "--document-root", "app", \
  "--working-directory", "app", \
  "--directory-index", "index.html", \
  "--log-directory", "logs", \
  "--rotate-logs"]
