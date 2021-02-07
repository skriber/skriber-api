FROM node:13

WORKDIR /usr/src/app

COPY package*.json .
COPY yarn.lock .
COPY tsconfig.json .
COPY ormconfig.json .

RUN yarn install

RUN yarn global add pm2

COPY src ./src

RUN yarn build

ADD ./build .

CMD ["pm2-runtime","build/index.js"]