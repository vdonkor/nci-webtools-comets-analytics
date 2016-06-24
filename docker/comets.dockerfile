# include dependencies for COMETS
FROM r-base:latest

RUN apt-get update \ 
 && apt-get install -y git apache2-dev python-dev python-pip \
 && pip install flask mod_wsgi rpy2

 && R -e "install.packages(c('readxl', 'plyr', 'dplyr', 'reshape2', 'psych', 'tidyr', 'GeneNet'), repos='https://cran.rstudio.com')" \
 
 && mkdir /deploy \
 && cd /deploy \

 && git clone https://github.com/CBIIT/nci-webtools-comets-analytics.git /deploy/tmp/app \
 && git clone https://github.com/CBIIT/nci-analysis-tools-web-presence.git /deploy/tmp/common \

 && cp -r /deploy/tmp/app/comets /deploy/app \
 && cp -r /deploy/tmp/common/modules/mod_wsgi/build.sh /deploy/ \

 && rm -rf /deploy/tmp

 && sh /deploy/build.sh --name comets --port 9200 --root /deploy
 && sh /deploy/setup-comets.sh


EXPOSE 9200

ENTRYPOINT ["/deploy/wsgi/apachectl", "start", "-DFOREGROUND"]
