# include dependencies for COMETS
FROM cbiitss:rbase

RUN R -e "install.packages(c('readxl', 'plyr', 'dplyr', 'reshape2', 'psych', 'tidyr', 'GeneNet'), repos='https://cran.rstudio.com')" \
 
 && mkdir /deploy \
 && cd /deploy \

 && git clone https://github.com/CBIIT/nci-webtools-comets-analytics.git /deploy/tmp/app \
 && git clone https://github.com/CBIIT/nci-analysis-tools-web-presence.git /deploy/tmp/common \

 && cp -r /deploy/tmp/app/comets /deploy/app \
 && cp -r /deploy/tmp/common/modules/mod_wsgi/build.sh /deploy/ \

 && rm -rf /deploy/tmp \

 && sh build.sh --name comets --port 9200 --root /deploy \
 && sh setup-comets.sh

EXPOSE 9200

ENTRYPOINT ["/deploy/wsgi/apachectl", "start", "-DFOREGROUND"]
