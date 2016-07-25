####Deploying with Docker

This dockerfile is based on the cbiitss:r-base image provided in the docker feasibility study repository (https://github.com/CBIIT/nci-webtools-docker-feasibility).
To build all the dependencies, run the centos_6.7/build.sh script in a docker-enabled linux host, and then run the following commands to build the image:

```
git clone https://github.com/CBIIT/nci-webtools-comets-analytics.git
cd nci-webtools-comets-analytics/docker

docker build -t cbiitss:comets -f comets.dockerfile .
```

To start a container, first check out the comets repository code to a a directory and mount it to the /deploy/app directory at run-time. You may also mount a logs directory from an arbitrary location on the host to the /deploy/logs directory found within the container.
The deployment procedure may look something like this: 

```
git clone https://github.com/CBIIT/nci-webtools-comets-analytics /tmp/comets_repo

mkdir -p /local/content/apps/comets /local/content/logs/comets
cp -r /tmp/comets_repo/comets/* /local/content/apps/comets/

chown -r apache:apache /local/content/apps /local/content/logs
```

To start a container using these directories:

```
docker run -d \
  -p 8100:8000 \
  -v /local/content/apps/comets:/deploy/app \
  -v /local/content/logs/comets:/deploy/logs \
  cbiitss:comets
```

By default, this container will run on port 8000 but this may be bound to any free port on the host (in this case, port 8100)
