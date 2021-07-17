import {RedisClient} from 'redis';
import {ClientEvent, ClientEventData, createRedisClient} from "./util";

export class Publisher {

    private client: RedisClient;

    constructor() {
        this.client = createRedisClient()
    }

    publish(event: ClientEvent, data: ClientEventData) {
        this.client.publish(event, JSON.stringify(data));
    }

}

export const publisher = process.env.CLUSTERED_MODE === "true" ? new Publisher() : null;