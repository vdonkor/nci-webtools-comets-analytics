FROM cbiitss/comets:base0

# Copy entrypoint and make it executable
COPY "./entrypoint.processor.sh" "/bin/entrypoint.sh"

# Overwrite entrypoint
RUN dos2unix /bin/entrypoint.sh \
 && chmod 755 /bin/entrypoint.sh

WORKDIR /deploy/app

ENTRYPOINT ["entrypoint.sh"]
