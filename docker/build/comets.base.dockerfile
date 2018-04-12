FROM centos

RUN yum -y update \
 && yum -y install epel-release \
 && yum -y install \
    gcc \
    gcc-c++ \
    gcc-gfortran \
    httpd-devel \
    libcurl-devel \
    libpng-devel \
    libssh2-devel \
    libxml2-devel \
    openssl-devel \
    python \
    python-pip \
    python-devel \
    R \
    R-devel \
    readline-devel \
    subversion \
 && yum clean all

RUN { \
    echo "local({"                                      ;\
    echo "    r <- getOption('repos')"                  ;\
    echo "    r['CRAN'] <- 'http://cran.rstudio.com/'"  ;\
    echo "    options(repos = r)"                       ;\
    echo "})"                                           ;\
} | tee -a "/usr/lib64/R/library/base/R/Rprofile"

RUN ln -s /usr/lib/jvm/jre/lib/amd64/server/libjvm.so /usr/lib64/libjvm.so \
 && install -Dv /dev/null /usr/share/doc/R-3.4.{0-9}/html/R.css

RUN R -e "install.packages( \
        c('devtools', 'roxygen2'), \
        INSTALL_opts = c('--no-html') \
    );"

RUN R -e "\
    devtools::install_git('https://git.bioconductor.org/packages/BiocInstaller', branch = 'RELEASE_3_4'); \
    devtools::install_bioc('Biobase'); \
    devtools::install_version('ClassComparison',  version = '3.1.5'   ); \
    devtools::install_version('caret',            version = '6.0-79'  ); \
    devtools::install_version('dplyr',            version = '0.7.4'   ); \
    devtools::install_version('d3heatmap',        version = '0.6.1.2' ); \
    devtools::install_version('Hmisc',            version = '4.1-1'   ); \
    devtools::install_version('jsonlite',         version = '1.5'     ); \
    devtools::install_version('plotly',           version = '4.7.1'   ); \
    devtools::install_version('plyr',             version = '1.8.4'   ); \
    devtools::install_version('ppcor',            version = '1.1'     ); \
    devtools::install_version('psych',            version = '1.7.8'   ); \
    devtools::install_version('readxl',           version = '1.0.0'   ); \
    devtools::install_version('rio',              version = '0.5.9'   ); \
    devtools::install_version('shiny',            version = '1.0.5'   ); \
    devtools::install_version('shinyFiles',       version = '0.6.2'   ); \
    devtools::install_version('stringr',          version = '1.2.0'   ); \
    devtools::install_version('tidyr',            version = '0.8.0'   ); \
    devtools::install_version('xlsx',             version = '0.5.7'   ); "

RUN pip install --upgrade pip \
 && pip install \
    boto==2.48.0 \
    boto3==1.4.7 \
    flask==0.12.2 \
    mod_wsgi==4.5.18 \
    pyper==1.1.2 \
    pyyaml==3.12 \
    requests==2.18.4 \
    rpy2==2.8.0 \
    stompest==2.3.0 \
    stompest.async==2.3.0 \
    twisted==17.5.0

RUN localedef -i en_US -f UTF-8 en_US.UTF-8

# Copy entrypoint and make it executable
COPY "./entrypoint.sh" "/usr/bin/entrypoint.sh"

RUN chmod 755 /usr/bin/entrypoint.sh \
 && ln -s /usr/bin/entrypoint.sh /entrypoint.sh

# Copy comets package installation script and make it executable
COPY "./install_comets_package.sh" "/usr/bin/install_comets_package.sh"

RUN chmod 755 /usr/bin/install_comets_package.sh \
 && ln -s /usr/bin/install_comets_package.sh /install_comets_package.sh

RUN adduser -u 4004 ncianalysis

RUN mkdir -p /deploy/app /deploy/logs \
 && chown -R ncianalysis:ncianalysis /deploy

WORKDIR /deploy/app

ENTRYPOINT ["entrypoint.sh"]
