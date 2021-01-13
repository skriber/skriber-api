FROM node:12

WORKDIR /usr/src/app

COPY package*.json .
RUN npm install

RUN npm install pm2 -g

RUN npm run tsc

ADD ./build .

CMD ["pm2-runtime","server.js"]