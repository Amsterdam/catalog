#!/bin/bash

set -e
set -u


if [[ ${BASE_URL} =~ "acc" ]];
then
    echo "Converting map.data.amsterdam.nl to acc.map.data.amsterdam.nl"
    sed -i -e"s;\(https://\)\(.*map.data.amsterdam.nl\)\(.*\);\1acc.map.data.amsterdam.nl\3;" /usr/share/nginx/html/index.html
    echo "Converting t1.data.amsterdam.nl to acc.t1.map.data.amsterdam.nl"
    sed -i -e"s;\(https://\)\(.*t1.data.amsterdam.nl\)\(.*\);\1acc.t1.data.amsterdam.nl\3;" /usr/share/nginx/html/index.html
    echo "Converting api.data.amsterdam.nl to acc.api.map.data.amsterdam.nl"
    sed -i -e"s;\(https://\)\([^.]*api.data.amsterdam.nl\)\(.*\);\1acc.api.data.amsterdam.nl\3;" /usr/share/nginx/html/index.html
fi

echo "Converting %BASE_URL% to ${BASE_URL}"
sed -i -e"s;%BASE_URL%;${BASE_URL};" /usr/share/nginx/html/index.html

echo "Starting Nginx"
exec nginx -g "daemon off;"
