FROM cbiitss/python27:base0

RUN yum -y upgrade \
 && yum -y install \
        gcc \
        gcc-c++ \
        gcc-gfortran \
        httpd-devel \
        libcurl-devel \
        openssl-devel \
        R \
 && yum clean all

RUN pip install --upgrade pip rpy2 mod_wsgi flask
RUN R -e "install.packages(c( \
  'https://cran.rstudio.com/src/contrib/00Archive/jsonlite/jsonlite_0.9.22.tar.gz', \
  'https://cran.rstudio.com/src/contrib/00Archive/plyr/plyr_1.8.3.tar.gz', \
  'https://cran.rstudio.com/src/contrib/00Archive/dplyr/dplyr_0.4.3.tar.gz', \
  'https://cran.rstudio.com/src/contrib/00Archive/psych/psych_1.6.4.tar.gz', \
  'https://cran.rstudio.com/src/contrib/00Archive/readxl/readxl_0.1.0.tar.gz', \
  'https://cran.rstudio.com/src/contrib/00Archive/stringr/stringr_0.6.tar.gz', \
  'https://cran.rstudio.com/src/contrib/00Archive/tidyr/tidyr_0.5.0.tar.gz', \
  'https://cran.rstudio.com/src/contrib/00Archive/plotly/plotly_3.4.13.tar.gz' \
), repos='http://cran.rstudio.com')"

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
