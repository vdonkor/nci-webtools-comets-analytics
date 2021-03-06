# cbiitss/comets:base is built from:
# (in root directory)
# docker build -t cbiitss/comets:base -f docker/comets.base.dockerfile .
FROM cbiitss/comets:r-package

# Install additional dependencies. For example: 
# RUN yum -y update && yum -y install some_package && yum clean all
# RUN R -e "devtools::install_version('package_name', quick = TRUE, version = '1.0');"

# Copy application source and configuration:
# Ensure that the comets/restricted folder contains the following:
#   settings.yml - private settings for comets
#   rcode - contents of Comets Analytics R Package. For example:
#           pushd /tmp
#           git clone https://github.com/CBIIT/R-cometsAnalytics 
#           popd
#           cp -R /tmp/R-cometsAnalytics/RPackageSource/* comets/restricted/rcode
COPY comets/* /deploy/app/

# Start application using entrypoint
ENTRYPOINT ["entrypoint.sh"]
