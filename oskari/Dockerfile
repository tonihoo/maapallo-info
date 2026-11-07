FROM tomcat:10.1.60-jdk17-temurin

RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        curl \
        nginx \
        openssl \
        postgresql-client \
        redis-server \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /usr/local/tomcat/webapps/* \
    && rm -f /etc/nginx/sites-enabled/default

# Static frontend is served at /Oskari. The context file resolves
# ../../sample-application from Tomcat's webapps directory.
COPY sample-application /usr/local/sample-application

COPY oskari-server/lib/oskari-ext.properties /usr/local/tomcat/lib/oskari-ext.properties
COPY oskari-server/lib/log4j2.xml /usr/local/tomcat/lib/log4j2.xml
COPY oskari-server/lib/articlesByTag /usr/local/tomcat/lib/articlesByTag
COPY oskari-server/lib/img /usr/local/tomcat/lib/img
COPY oskari-server/conf/server.xml /usr/local/tomcat/conf/server.xml
COPY oskari-server/conf/Catalina/localhost/Oskari.xml /usr/local/tomcat/conf/Catalina/localhost/Oskari.xml

RUN sed -i 's/scheme="https" secure="true"/scheme="http" secure="false"/' /usr/local/tomcat/conf/server.xml

# The war is 103 MB, over GitHub's 100 MB limit, so the image downloads the
# official 3.4.0 package instead of keeping the file in git.
RUN curl -fsSL -o /tmp/oskari-3.4.0.zip https://download.osgeo.org/oskari/oskari-3.4.0.zip \
    && mkdir -p /tmp/oskari-pkg /usr/local/tomcat/webapps/ROOT \
    && cd /tmp/oskari-pkg \
    && jar xf /tmp/oskari-3.4.0.zip oskari-map.war \
    && cd /usr/local/tomcat/webapps/ROOT \
    && jar xf /tmp/oskari-pkg/oskari-map.war \
    && rm -rf /tmp/oskari-3.4.0.zip /tmp/oskari-pkg

COPY custom/WEB-INF/jsp/geoportal.jsp /usr/local/tomcat/webapps/ROOT/WEB-INF/jsp/geoportal.jsp
COPY custom/favicon.ico /tmp/favicon.ico
RUN mkdir -p /tmp/fav/images \
    && cp /tmp/favicon.ico /tmp/fav/images/favicon.ico \
    && cp /tmp/favicon.ico /tmp/fav/images/favicon-light.ico \
    && cp /tmp/favicon.ico /tmp/fav/images/favicon-dark.ico \
    && cd /tmp/fav \
    && jar uf /usr/local/tomcat/webapps/ROOT/WEB-INF/lib/servlet-map-3.4.0.jar \
        images/favicon.ico images/favicon-light.ico images/favicon-dark.ico \
    && rm -rf /tmp/fav /tmp/favicon.ico
COPY nginx.conf.template /opt/nginx.conf.template
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 8080
ENTRYPOINT ["/docker-entrypoint.sh"]
