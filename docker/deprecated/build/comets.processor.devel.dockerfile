FROM cbiitss/comets:base0

RUN rm -rf /entrypoint.sh

# Copy entrypoint and make it executable
COPY "./entrypoint.processor.devel.sh" "/usr/bin/entrypoint.sh"

RUN chmod 755 /usr/bin/entrypoint.sh \
 && ln -s /usr/bin/entrypoint.sh /entrypoint.sh

WORKDIR /deploy/app

ENTRYPOINT ["entrypoint.sh"]