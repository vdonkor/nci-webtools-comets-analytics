FROM cbiit/centos7_base

RUN yum makecache fast \
 && yum -y update \
 && yum -y install epel-release \
 && yum -y install bzip2 fontconfig python-devel python2-pip \
 && yum clean all

# install selnium
RUN pip install --upgrade pip \
 && pip install selenium

# install phantomjs webdriver
RUN cd /usr/bin \
 && curl -L https://bitbucket.org/ariya/phantomjs/downloads/phantomjs-2.1.1-linux-x86_64.tar.bz2 \
    | tar -xj */bin/phantomjs --strip-components=2 \
 && chmod 755 /usr/bin/phantomjs

# create entrypoint
RUN { \
    echo "#!/bin/bash" ; \
    echo "python \${1}" ; \
} | tee "/usr/bin/entrypoint.sh"

RUN chmod 755 /usr/bin/entrypoint.sh \
 && ln -s /usr/bin/entrypoint.sh /entrypoint.sh

# create tests directory
RUN mkdir -p /tests \
 && chmod -R 777 /tests

CMD ["entrypoint.sh"] 
