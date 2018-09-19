#### Deploying with Docker

The COMETS web application is built on python flask, and uses a queue for long-running correlation jobs. The following docker images (available on DockerHub) are used:

- cbiitss/comets (web application)
- cbiitss/comets:processor (background job processor)
- cbiitss/activemq (job queue)

To run the COMETS web application locally (eg: for development or personal use), we can use docker-compose:

```bash

# Clone the COMETS application repository to the "comets_app" directory
git clone https://github.com/CBIIT/nci-webtools-comets-analytics comets_app

# Clone the COMETs package to the "rcode" directory of the comets_app/comets/restricted folder
git clone https://github.com/CBIIT/R-cometsAnalytics comets_app/comets/restricted/rcode

# Change directory to comets_app/docker and use docker-compose to run the application
cd comets_app/docker
docker-compose up

```