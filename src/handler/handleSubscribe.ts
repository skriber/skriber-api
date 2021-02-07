import { createHmac } from "crypto";
import { Connection } from "typeorm";
import { WebSocket } from "uWebSockets.js";
import { ApiKey } from "../entity/ApiKey";
import Application from "../entity/Application";
import logger from "../logger";
import { ErrorMessage, EventMessage, IMessage, PresenceJoinMessage, SubscribedMessage, SubscribeMessage } from "../messages";

type Channel = 'public' | 'private' | 'presence';

export default async function (message: SubscribeMessage, ws: WebSocket, connection: Connection): Promise<IMessage> {
    const channelName: string = message.payload.channel;

    const channelType: Channel = channelName.endsWith('.presence') ? 'presence' : (channelName.endsWith('.private') ? 'private' : 'public');

    if(!channelName.includes(':')) {
        return {
            type: 'error',
            payload: `Malformed channel name "${channelName}"`
        };
    }

    const splittedChannel: string[] = channelName.split(':');

    const applicationUuid: string = splittedChannel[0];
    const channel: string = splittedChannel[1];

    const errorMessage: ErrorMessage = {
        type: 'error',
        payload: {
            error: `Not authorized to subscribe to channel "${channel}"`
        }
    };
    
    if(channelType !== 'public') {
        if(!message.payload.signature) {
            return errorMessage;
        }

        if(!message.payload.signature.includes(':')) {
            return errorMessage;
        }

        const splittedSignature: string[] = message.payload.signature.split(':');

        const apiKey: ApiKey = await connection.getRepository(ApiKey).findOne({
            publicKey: splittedSignature[0]
        });

        if(!apiKey) {
            return errorMessage;
        }

        let digest: string = undefined;
        if(channelType === 'private') {
            digest = createHmac('sha256', apiKey.secretKey).update(`${ws.uuid};${channelName}`).digest('hex');
        } else {
            digest = createHmac('sha256', apiKey.secretKey).update(`${ws.uuid};${channelName};${JSON.stringify(message.payload.data)}`).digest('hex');
        }

        if(digest !== splittedSignature[1]) {
            return errorMessage;
        }
    }

    if(channelType === 'presence') {
        const event: PresenceJoinMessage = {
            type: "presence_join",
            payload: {
                channel: channel,
                data: message.payload.data
            }
        };

        // TODO: send to channel via app.publish

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