FROM cbiitss/comets

# Copy entrypoint and make it executable
COPY "./entrypoint.processor.sh" "/bin/entrypoint.processor.sh"

RUN dos2unix /bin/entrypoint.processor.sh \
 && chmod 755 /bin/entrypoint.processor.sh

ENTRYPOINT ["entrypoint.processor.sh"]
