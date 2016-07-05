# include dependencies for COMETS
FROM cbiitss:rbase-test

ENTRYPOINT ["/deploy/wsgi/apachectl", "start", "-DFOREGROUND"]
