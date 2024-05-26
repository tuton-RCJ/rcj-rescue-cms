FROM ryorobo/rcj-scoring-node:latest

COPY . /opt/rcj-cms/
WORKDIR /opt/rcj-cms

CMD ["npm", "run", "start"]
EXPOSE 3000
