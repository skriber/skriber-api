FROM node:13 AS APP_BUILD

WORKDIR /usr/src/app

COPY package*.json .
COPY yarn.lock .
COPY tsconfig.json .
COPY ormconfig.json .

RUN yarn install

COPY src ./src

RUN yarn build

FROM node:13

WORKDIR /opt/skriber

RUN yarn global add pm2

COPY ormconfig.json .
COPY package*.json .
COPY yarn.lock .

COPY --from=APP_BUILD /usr/src/app/node_modules/ ./node_modules

COPY --from=APP_BUILD /usr/src/app/build/ ./build

CMD ["pm2-runtime", "./build/index.js"]