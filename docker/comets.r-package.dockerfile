# cbiitss/comets:base is built from:
# (in root directory)
# pushd docker && docker build -t cbiitss/comets:base -f comets.base.dockerfile . && popd
# docker build -t cbiitss/comets:r-package -f docker/comets.r-package.dockerfile .
FROM cbiitss/comets:base0

# Ensure that the comets/restricted folder contains the following:
#   rcode - contents of Comets Analytics R Package. For example:
#           pushd /tmp
#           git clone https://github.com/CBIIT/R-cometsAnalytics 
#           popd
#           cp -R /tmp/R-cometsAnalytics/RPackageSource/* comets/restricted/rcode
RUN mkdir -p /deploy/app/restricted/rcode
COPY comets/restricted/rcode/* /deploy/app/restricted/rcode

# Install COMETS Package
RUN install_comets_package.sh
