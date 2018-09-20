FROM cbiitss/comets

# Install RStudio Server
RUN yum -y install https://download2.rstudio.org/rstudio-server-rhel-1.1.456-x86_64.rpm

# Copy entrypoint and make it executable
COPY "./entrypoint.dev.sh" "/bin/entrypoint.dev.sh"

RUN dos2unix /bin/entrypoint.dev.sh \
 && chmod 755 /bin/entrypoint.dev.sh

EXPOSE 8787

ENTRYPOINT ["entrypoint.dev.sh"]
