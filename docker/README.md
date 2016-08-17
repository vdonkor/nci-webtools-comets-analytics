####Deploying with Docker

The tech stack for COMETS is available as an image on [Dockerhub](https://hub.docker.com/r/cbiitss/comets/). To deploy the COMETS web application, simply pull the [code](https://github.com/CBIIT/nci-webtools-comets-analytics) and [R package](https://github.com/CBIIT/R-cometsAnalytics) from Github and mount their respective directories as volumes during startup. You will then need to install the package in the running container through docker exec, and then restart the running container to re-initialize the application with the new package. This approach ensures that the package and code are maintained separately, allowing for a more controlled deployment procedure. 

The deployment procedure may look something like this: 

```bash

# Create deployment directories for the application, package, and logs
mkdir -p /docker_apps/comets/app /docker_apps/comets/logs 

# Clone the repositories containing application and package code
git clone https://github.com/CBIIT/nci-analysis-tools-web-presence.git /tmp/web_presence
git clone https://github.com/CBIIT/nci-webtools-comets-analytics /tmp/comets_app
git clone https://github.com/CBIIT/R-cometsAnalytics /tmp/comets_package

# Copy the application and package code to the deployment directories
cp -r /tmp/comets_app/comets/* /docker_apps/comets/app/
cp -r /tmp/web_presence/common/ /docker_apps/comets/app/
cp -r /tmp/comets_package/* /docker_apps/comets/rcode/

```

Use ```docker run ``` to start the application:

```bash

# Pull latest image
docker pull cbiitss/comets:base0

# Start container
docker run \
  --detach \
  --name comets \
  --publish 8100:8000 \
  --volume /docker_apps/comets/:/deploy/ \
  cbiitss/comets:base0

# Install package
docker exec --user root comets bash -c "R CMD INSTALL /deploy/app/rcode > /deploy/logs/update_comets_package.log  2>&1"

# Restart container to use updated R package
docker restart comets

# Navigate to localhost:8100 to access the application
  
```

