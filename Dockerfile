FROM ryorobo/rcj-scoring-node:latest

COPY . /opt/rcj-cms/
WORKDIR /opt/rcj-cms

RUN npm run build

CMD ["node", "server.js"]
EXPOSE 3000
