FROM node:14 AS DEPS

RUN mkdir /deps

COPY package*.json /deps
COPY yarn.lock /deps

WORKDIR /deps

RUN yarn install

FROM node:14 AS APP_BUILD

RUN mkdir -p /app
WORKDIR /app

COPY package*.json .
COPY tsconfig.json .
COPY ormconfig.json .
COPY --from=DEPS /deps/node_modules ./node_modules

COPY src ./src

RUN yarn build

FROM node:14-alpine AS APP_RUN

WORKDIR /opt/skriber

RUN yarn global add pm2

COPY --from=APP_BUILD /app /opt/skriber

RUN ln -s /lib/libc.musl-x86_64.so.1 /lib/ld-linux-x86-64.so.2

CMD ["pm2-runtime", "./build/index.js"]