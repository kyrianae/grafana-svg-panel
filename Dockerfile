ARG grafana_version=12.4.0
ARG grafana_image=grafana-enterprise

FROM grafana/${grafana_image}:${grafana_version}

ARG anonymous_auth_enabled=true
ARG development=false

ENV DEV="${development}"
ENV GF_AUTH_ANONYMOUS_ORG_ROLE="Admin"
ENV GF_AUTH_ANONYMOUS_ENABLED="${anonymous_auth_enabled}"
ENV GF_AUTH_BASIC_ENABLED="false"
ENV GF_DEFAULT_APP_MODE="development"
ENV GF_PATHS_HOME="/usr/share/grafana"

LABEL maintainer="Grafana Labs <hello@grafana.com>"

WORKDIR $GF_PATHS_HOME

USER root

RUN if [ "${development}" = "true" ]; then \
    if grep -i -q alpine /etc/issue; then \
      apk add supervisor inotify-tools git; \
    elif grep -i -q ubuntu /etc/issue; then \
      DEBIAN_FRONTEND=noninteractive && \
      apt-get update && \
      apt-get install -y supervisor inotify-tools git && \
      rm -rf /var/lib/apt/lists/*; \
    else \
      echo 'ERROR: Unsupported base image' && /bin/false; \
    fi; \
  fi

COPY .config/supervisord/supervisord.conf /etc/supervisor.d/supervisord.ini
COPY .config/supervisord/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

RUN sed -i 's|</body>|<script src="http://localhost:35729/livereload.js"></script></body>|g' /usr/share/grafana/public/views/index.html

COPY .config/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
