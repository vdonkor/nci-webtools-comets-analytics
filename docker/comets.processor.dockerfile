FROM cbiitss/comets:base0

# Copy entrypoint and make it executable
COPY "./entrypoint.processor.sh" "/usr/bin/entrypoint.sh"

RUN dos2unix /usr/bin/entrypoint.sh \
 && chmod 755 /usr/bin/entrypoint.sh \
 && rm -rf /entrypoint.sh \
 && ln -s /usr/bin/entrypoint.sh /entrypoint.sh

WORKDIR /deploy/app

ENTRYPOINT ["entrypoint.sh"]
