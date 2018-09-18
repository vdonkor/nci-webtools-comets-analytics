FROM cbiitss/comets:base0

# Install RStudio Server
RUN yum -y install https://download2.rstudio.org/rstudio-server-rhel-1.1.456-x86_64.rpm

# Copy entrypoint and make it executable
COPY "./entrypoint.dev.sh" "/bin/entrypoint.dev.sh"

# Overwrite entrypoint
RUN dos2unix /bin/entrypoint.sh \
 && chmod 755 /bin/entrypoint.sh

WORKDIR /deploy/app

ENTRYPOINT ["entrypoint.sh"]
