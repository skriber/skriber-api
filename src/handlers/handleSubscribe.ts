import {createHmac} from "crypto";
import {Connection} from "typeorm";
import {WebSocket} from "uWebSockets.js";
import {ApiKey} from "../entities";
import logger from "../logger";
import {ErrorMessage, IMessage, SubscribeMessage, SubscriptionSuccessMessage} from "../messages";

type Channel = 'public' | 'private';

export async function handleSubscribe(message: SubscribeMessage, ws: WebSocket, connection: Connection): Promise<IMessage> {
    const channelName: string = message.payload.channel;

    const channelType: Channel = channelName.endsWith('/private') ? 'private' : 'public';

    if (!channelName.includes('/')) {
        return {
            type: 'error',
            payload: `Malformed channel name "${channelName}"`
        };
    }

    const appId: string = channelName.substring(0, channelName.indexOf('/'));

    const errorMessage: ErrorMessage = {
        type: 'error',
        payload: {
            error: `Not authorized to subscribe to channel "${channelName}"`
        }
    };

    if(appId != ws.appId) {
        return errorMessage;
    }

    if (channelType !== 'public') {
        if (!message.payload.signature) {
            return errorMessage;
        }

        if (!message.payload.signature.includes(':')) {
            return errorMessage;
        }

        // signature: publicKey:hmac
        // hmac: socket_id;channel
        const splitSignature: string[] = message.payload.signature.split(':');

        const apiKey: ApiKey = await connection.getRepository(ApiKey).findOne({
            publicKey: splitSignature[0]
        });

        if (!apiKey) {
            return errorMessage;
        }

        let digest: string = undefined;
        if (channelType === 'private') {
            digest = createHmac('sha256', apiKey.secretKey).update(`${ws.uuid};${channelName}`).digest('hex');
        }

        if (digest !== splitSignature[1]) {
            return errorMessage;
        }
    }

    ws.subscribe(channelName);

    logger.info(`Created new Subscription for Socket >${ws.uuid}< for channel "${channelName}"`);

    return <SubscriptionSuccessMessage>{
        type: "subscription_success",
        payload: {
            channel: channelName
        }
    }
}