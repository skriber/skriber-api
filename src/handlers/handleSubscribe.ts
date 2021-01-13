import { Connection } from "typeorm";
import { WebSocket } from "uWebSockets.js";
import Application from "../entity/Application";
import ChannelAuth from "../entity/ChannelAuth";
import logger from "../logger";
import { ErrorMessage, IMessage, SubscribedMessage, SubscribeMessage } from "../messages";

export default async function (message: SubscribeMessage, ws: WebSocket, connection: Connection): Promise<IMessage> {
    const channelName: string = message.payload.channel;

    if(!channelName.includes(':')) {
        return {
            type: 'error',
            payload: `Malformed channel name "${channelName}"`
        };
    }

    const splittedChannel: string[] = channelName.split(':');

    const applicationUuid: string = splittedChannel[0];
    const channel: string = splittedChannel[1];

    const application: Application = await connection.getRepository(Application).findOne({
        uuid: applicationUuid
    });
    
    if(channel.endsWith('.private')) {
        const channelAuth: ChannelAuth = await connection.getRepository(ChannelAuth).findOne({
            relations: [
                'application'
            ],
            where: {
                channel: channel,
                socket: ws.uuid
            }
        });

        if(!channelAuth) {
            return <ErrorMessage> {
                type: 'error',
                payload: {
                    error: `Not authorized to subscribe to channel "${channel}"`
                }
            }
        }
    }

    ws.subscribe(channelName);
    
    logger.info(`Created new Subscription for Socket >${ws.uuid}< for channel "${channel}"`);

    return <SubscribedMessage> {
        type: "subscribed",
        payload: {
            channel: channelName
        }
    }
}