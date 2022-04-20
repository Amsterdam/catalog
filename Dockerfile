# webserver image.
FROM nginx:1.21
MAINTAINER datapunt.ois@amsterdam.nl

ENV BASE_URL=https://api.data.amsterdam.nl/
COPY cmd.sh /usr/local/bin/
RUN chmod 755 /usr/local/bin/cmd.sh

COPY static/ /usr/share/nginx/html/
CMD cmd.sh
