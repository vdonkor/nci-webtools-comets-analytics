FROM centos:7

# Install/update system packages
RUN yum -y update \
 && yum -y install \
    https://repo.ius.io/ius-release-el7.rpm \
    https://dl.fedoraproject.org/pub/epel/epel-release-latest-7.noarch.rpm \
 && yum -y install \
    dos2unix \
    gcc \
    gcc-c++ \
    gcc-gfortran \
    httpd-devel \
    libcurl-devel \
    libgit2-devel \
    libpng-devel \
    libssh2-devel \
    libxml2-devel \
    openssl-devel \
    python36 \
    python36-devel \
    python36-pip \
    R \
    R-devel \
    readline-devel \
    subversion \
 && yum clean all

# Set en_us.UTF-8 as the locale
RUN localedef -i en_US -f UTF-8 en_US.UTF-8

# Use libjvm.so from jre
RUN ln -s /usr/lib/jvm/jre/lib/amd64/server/libjvm.so /usr/lib64/libjvm.so

RUN mkdir -p /usr/share/doc/R-3.6.0/html \
 && touch /usr/share/doc/R-3.6.0/html/R.css

# Set CRAN respository
RUN { \
    echo "local({"                                         ;\
    echo "    r <- getOption('repos')"                     ;\
    echo "    r['CRAN'] <- 'https://cloud.r-project.org/'" ;\
    echo "    options(repos = r)"                          ;\
    echo "})"                                              ;\
} | tee -a "/usr/lib64/R/library/base/R/Rprofile"


# Install R development tools
RUN R -e "install.packages(c('devtools', 'roxygen2', 'BiocManager'))"

# Install R dependencies
RUN R -e "BiocManager::install(c('Biobase', 'ClassComparison'), ask = FALSE, update = FALSE);"
RUN R -e "devtools::install_version('dplyr',            quick = TRUE, version = '0.7.8'   );"
RUN R -e "devtools::install_version('d3heatmap',        quick = TRUE, version = '0.6.1.2' );"
RUN R -e "devtools::install_version('Hmisc',            quick = TRUE, version = '4.1-1'   );"
RUN R -e "devtools::install_version('jsonlite',         quick = TRUE, version = '1.5'     );"
RUN R -e "devtools::install_version('plotly',           quick = TRUE, version = '4.8.0'   );"
RUN R -e "devtools::install_version('plyr',             quick = TRUE, version = '1.8.4'   );"
RUN R -e "devtools::install_version('ppcor',            quick = TRUE, version = '1.1'     );"
RUN R -e "devtools::install_version('psych',            quick = TRUE, version = '1.8.10'  );"
RUN R -e "devtools::install_version('readxl',           quick = TRUE, version = '1.1.0'   );"
RUN R -e "devtools::install_version('rio',              quick = TRUE, version = '0.5.16'  );"
RUN R -e "devtools::install_version('shiny',            quick = TRUE, version = '1.2.0'   );"
RUN R -e "devtools::install_version('shinyFiles',       quick = TRUE, version = '0.7.2'   );"
RUN R -e "devtools::install_version('stringr',          quick = TRUE, version = '1.3.1'   );"
RUN R -e "devtools::install_version('subselect',        quick = TRUE, version = '0.14'    );"
RUN R -e "devtools::install_version('tidyr',            quick = TRUE, version = '0.8.2'   );"
RUN R -e "devtools::install_version('xlsx',             quick = TRUE, version = '0.6.1'   );"
RUN R -e "devtools::install_version('caret',            quick = TRUE, version = '6.0-81'  );"

# Install python 3 dependencies
RUN pip3 install --upgrade pip \
 && pip3 install \
    boto~=2.49 \
    boto3~=1.10 \
    flask~=1.1 \
    mod_wsgi~=4.6 \
    pyper==1.1.2 \
    pyyaml~=5.1 \
    requests~=2.22 \
    rpy2~=3.2 \
    stompest~=2.3 \
    stompest.async~=2.3.0 \
    twisted~=19.7

# Copy entrypoint and make it executable
COPY "./entrypoint.sh" "/bin/entrypoint.sh"

RUN dos2unix /bin/entrypoint.sh \
 && chmod 755 /bin/entrypoint.sh

# Copy install_comets_package script and make it executable
COPY "./install_comets_package.sh" "/bin/install_comets_package.sh"

RUN dos2unix /bin/install_comets_package.sh \
 && chmod 755 /bin/install_comets_package.sh

RUN mkdir -p /deploy/app /deploy/logs

WORKDIR /deploy/app

EXPOSE 8000

ENTRYPOINT ["entrypoint.sh"]
