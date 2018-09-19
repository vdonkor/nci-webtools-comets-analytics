FROM cbiitss/comets

# Install RStudio Server
RUN yum -y install https://download2.rstudio.org/rstudio-server-rhel-1.1.456-x86_64.rpm

EXPOSE 8787

ENTRYPOINT ["entrypoint.dev.sh"]
