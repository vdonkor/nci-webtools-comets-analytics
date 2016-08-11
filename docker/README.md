####Deploying with Docker

The tech stack for COMETS is available as an image on [Dockerhub](https://hub.docker.com/r/cbiitss/comets/). To deploy the COMETS web application, simply pull the [code](https://github.com/CBIIT/nci-webtools-comets-analytics) and [R package](https://github.com/CBIIT/R-cometsAnalytics) from Github and mount their respective directories as volumes during startup. You will then need to install the package in the running container through docker exec, and then restart the running container to re-initialize the application with the new package. This approach ensures that the package and code are maintained separately, allowing for a more controlled deployment procedure. 

The deployment procedure may look something like this: 

```bash

# Create deployment directories for the application, package, and logs
mkdir -p /docker_apps/comets/app /docker_apps/comets/package /docker_apps/comets/logs

# Clone the repositories containing the application and package code
git clone https://github.com/CBIIT/nci-webtools-comets-analytics /tmp/comets_app
git clone https://github.com/CBIIT/R-cometsAnalytics /tmp/comets_package

# Copy the application code and package to the deployment directories
cp -r /tmp/comets_app/comets/* /docker_apps/comets/app/
cp -r /tmp/comets_package/* /docker_apps/comets/rcode/

```

To start application, use the docker run command:

```bash

# Pull latest image
docker pull cbiitss/comets:base0

# Start container
docker run --detached \
  --name comets
  --publish 8100:8000 \
  --volume /docker_apps/comets/app:/deploy/app \
  --volume /docker_apps/comets/logs:/deploy/logs \
  cbiitss/comets:base0

# Install package
docker exec --user root comets bash -c "cd /deploy/app && R CMD INSTALL rcode >> /deploy/logs/update_cometsR.log  2>&1"

# Restart container to initialize package
docker restart comets
  
```

