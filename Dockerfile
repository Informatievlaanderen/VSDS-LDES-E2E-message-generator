# build environment
FROM node:20-bullseye-slim AS builder
# fix vulnerabilities
ARG NPM_TAG=10.2.3
RUN npm install -g npm@${NPM_TAG}
# build it
WORKDIR /build
COPY . .
RUN npm ci
RUN npm run build

# run environment
FROM node:20.9.0-bullseye-slim
# fix vulnerabilities
# note: trivy insists this to be on the same RUN line
RUN apt-get -y update && apt-get -y upgrade
RUN apt-get -y install apt-utils
WORKDIR /usr/vsds/generator
# fix vulnerabilities
RUN npm install -g npm@${NPM_TAG}
## setup to run as less-privileged user
COPY --chown=node:node --from=builder /build/package*.json ./
COPY --chown=node:node --from=builder /build/dist ./
## install dependancies
ENV NODE_ENV production
RUN npm ci --omit=dev
## install signal-handler wrapper
RUN apt-get -y install dumb-init
## allow passing variables
ARG SILENT=false
ENV SILENT=${SILENT}
ARG TARGETURL=
ENV TARGETURL=${TARGETURL}
ARG CRON=
ENV CRON=${CRON}
ARG TEMPLATEFILE=
ENV TEMPLATEFILE=${TEMPLATEFILE}
ARG TEMPLATE=
ENV TEMPLATE=${TEMPLATE}
ARG MIMETYPE=
ENV MIMETYPE=${MIMETYPE}
ARG RANGE=
ENV RANGE=${RANGE}
ARG MAX_RETRIES=5
ENV MAX_RETRIES=${MAX_RETRIES}
ARG RETRY_TIMEOUT=10
ENV RETRY_TIMEOUT=${RETRY_TIMEOUT}
## set start command
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
USER node
CMD ["sh", "-c", "node index.js --silent=${SILENT} --retryTimeout=${RETRY_TIMEOUT} --maxRetries=${MAX_RETRIES} --range=${RANGE} --mimeType=\"${MIMETYPE}\" --targetUrl=${TARGETURL} --cron=\"${CRON}\" --template=\"${TEMPLATE}\" --templateFile=${TEMPLATEFILE}"]
