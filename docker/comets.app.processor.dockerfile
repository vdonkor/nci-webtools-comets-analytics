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
COPY comets/* /deploy/app/

# Copy entrypoint and make it executable
COPY docker/entrypoint.processor.sh /bin/entrypoint.processor.sh

RUN dos2unix /bin/entrypoint.processor.sh \
 && chmod 755 /bin/entrypoint.processor.sh

# Start application using entrypoint
ENTRYPOINT ["entrypoint.processor.sh"]
