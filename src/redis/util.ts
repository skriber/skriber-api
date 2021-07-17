import {createClient, RedisClient} from "redis";
import logger from "../logger";

export type ClientEvent = "publish_event";

export type ClientEventData = {
    channel: string;
    data: string;
}

export function createRedisClient(): RedisClient {
    const redisPort = parseInt(process.env.REDIS_PORT);

    if(isNaN(redisPort)) {
        logger.error(`Could not read redis port ${process.env.REDIS_PORT} from env`);
        return null;
    }

    return createClient({
        host: process.env.REDIS_URL,
        port: redisPort,
        password: process.env.REDIS_PASSWORD,
        tls: {}
    });
}