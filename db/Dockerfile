FROM timescale/timescaledb-ha:pg16

USER root

# Install required tools and pgmq extension from Tembo's apt repository
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && curl -sLO https://github.com/tembo-io/pgmq/releases/download/v1.3.3/postgresql-16-pgmq_1.3.3_amd64.deb \
    && dpkg -i postgresql-16-pgmq_1.3.3_amd64.deb || apt-get install -f -y \
    && rm postgresql-16-pgmq_1.3.3_amd64.deb \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Switch back to the default user
USER postgres
