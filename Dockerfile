FROM ryorobo/rcj-scoring-node:latest

COPY . /opt/rcj-cms/
WORKDIR /opt/rcj-cms

RUN npm run build

ENTRYPOINT ["node server"]
EXPOSE 3000
