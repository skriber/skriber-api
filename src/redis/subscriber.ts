import {RedisClient} from 'redis';
import logger from "../logger";
import {ClientEvent, ClientEventData, createRedisClient} from "./util";

export type EventListener = (data: ClientEventData) => void;

export class Subscriber {

    private client: RedisClient;
    private listener: Map<ClientEvent, EventListener>;

    constructor() {
        this.client = createRedisClient();
        this.listener = new Map<ClientEvent, EventListener>();
        this.client.on("message", (event: ClientEvent, data: string) => {
            this.handleMessage(event, data);
        });
    }

    subscribe(event: ClientEvent, cb: EventListener) {
        this.client.subscribe(event);
        this.listener.set(event, cb);
    }

    unsubscribe(event: ClientEvent) {
        this.client.unsubscribe(event);
        this.listener.delete(event);
    }

    private handleMessage(event: ClientEvent, data: string) {
        const json: ClientEventData = <ClientEventData> JSON.parse(data);
        logger.debug(`Handle redis event: ${event}`);

        const listener: EventListener = this.listener.get(event);
        if(!listener) {
            logger.warn(`No listener registered for event: ${event}`);
            return;
        }

        listener(json);
    }

}

export const subscriber = process.env.CLUSTERED_MODE === "true" ? new Subscriber() : null;