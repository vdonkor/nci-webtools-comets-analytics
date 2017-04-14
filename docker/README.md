#### Deploying with Docker

The tech stack for COMETS is available as an image on [Dockerhub](https://hub.docker.com/r/cbiitss/comets/). To deploy the COMETS web application, simply pull the [code](https://github.com/CBIIT/nci-webtools-comets-analytics) and [R package](https://github.com/CBIIT/R-cometsAnalytics) from Github and mount their respective directories as volumes during startup. You will then need to install the package in the running container through docker exec, and then restart the running container to re-initialize the application with the new package. This approach ensures that the package and code are maintained separately, allowing for a more controlled deployment procedure. 

The deployment procedure may look something like this: 

```bash

APP_DIR=/docker_apps/comets/app
LOGS_DIR=/docker_apps/comets/logs
COMPOSE_DIR=/docker_apps/comets/docker

# Create deployment directories for the application, package, and logs
mkdir -p $APP_DIR $LOG_DIR $COMPOSE_DIR

# Clone the repositories containing application and package code
git clone https://github.com/CBIIT/nci-analysis-tools-web-presence.git /tmp/web_presence
git clone https://github.com/CBIIT/nci-webtools-comets-analytics /tmp/comets_app
git clone https://github.com/CBIIT/R-cometsAnalytics /tmp/comets_package

# Copy the application and package code to the deployment directories
cp -r /tmp/comets_app/comets/* $APP_DIR
cp -r /tmp/web_presence/common/ $APP_DIR
cp -r /tmp/comets_package/* $APP_DIR/restricted/rcode/

# copy the docker-compose files to the deployment directories
cp -r /tmp/comets_app/docker/* $COMPOSE_DIR
```

Use ```docker-compose up ``` to start the application:

```bash

# Pull latest images
cd $COMPOSE_DIR
docker-compose -f comets.compose pull comets comets_processor activemq

# Start COMETS
docker-compose -f comets.compose up

# To update the COMETS R package, copy the latest package into the rcode directory, 
# then run the install_comets_package.sh script and restart

docker-compose -f comets.compose exec -T --user root comets install_comets_package.sh
docker-compose -f comets.compose exec -T --user root comets_processor install_comets_package.sh

# Restart containers to use updated R package
docker-compose -f comets.compose restart

# Navigate to localhost:8100 to access the application
  
```

