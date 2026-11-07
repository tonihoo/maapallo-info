#!/bin/bash
# Local Compose overrides the image entrypoint with this script so edits to
# custom/WEB-INF/jsp/geoportal.jsp show up on the next page load.
set -euo pipefail

WEB=/usr/local/tomcat/conf/web.xml
if ! grep -q '<param-name>modificationTestInterval</param-name>' "$WEB"; then
  awk '
    { print }
    /org\.apache\.jasper\.servlet\.JspServlet<\/servlet-class>/ && !done {
      print "        <init-param>"
      print "            <param-name>development</param-name>"
      print "            <param-value>true</param-value>"
      print "        </init-param>"
      print "        <init-param>"
      print "            <param-name>modificationTestInterval</param-name>"
      print "            <param-value>0</param-value>"
      print "        </init-param>"
      done = 1
    }
  ' "$WEB" > "$WEB.new"
  mv "$WEB.new" "$WEB"
fi

SRC=/opt/maapallo-custom/WEB-INF/jsp/geoportal.jsp
DST=/usr/local/tomcat/webapps/ROOT/WEB-INF/jsp/geoportal.jsp

copy_jsp() {
  if [ -f "$SRC" ]; then
    cp "$SRC" "$DST"
  fi
}

copy_jsp
nohup bash -c '
  last=$(stat -c %Y "$1")
  while true; do
    now=$(stat -c %Y "$1" 2>/dev/null || echo "$last")
    if [ "$now" != "$last" ]; then
      cp "$1" "$2"
      last=$now
    fi
    sleep 0.2
  done
' _ "$SRC" "$DST" >/tmp/jsp-sync.log 2>&1 &
disown || true

exec /docker-entrypoint.sh
