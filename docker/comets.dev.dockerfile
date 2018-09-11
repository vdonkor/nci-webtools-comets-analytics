FROM cbiitss/comets:base0

# Install RStudio Server
RUN yum -y install https://download2.rstudio.org/rstudio-server-rhel-1.1.456-x86_64.rpm \
 && echo ncianalysis | passwd --stdin ncianalysis

# Copy entrypoint and make it executable
COPY "./entrypoint.dev.sh" "/usr/bin/entrypoint.sh"

# Overwrite entrypoint and symlinks
RUN dos2unix /usr/bin/entrypoint.sh \
 && chmod 755 /usr/bin/entrypoint.sh \
 && rm -rf /entrypoint.sh \
 && ln -s /usr/bin/entrypoint.sh /entrypoint.sh

WORKDIR /deploy/app

ENTRYPOINT ["entrypoint.sh"]
