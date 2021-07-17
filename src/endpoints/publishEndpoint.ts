import {createHmac} from "crypto";
import {Connection} from "typeorm";
import {HttpRequest, HttpResponse, TemplatedApp} from "uWebSockets.js";
import {ApiKey} from "../entities";
import logger from "../logger";
import {readJson} from "../utils";
import {EventMessage} from "../messages";
import {publisher} from "../redis";
import {totalBytesTransmittedMetric} from "../metrics";

type PublishDto = {
    channel: string;
    payload: any;
};

/*
 *
 */
export async function publishEndpoint(res: HttpResponse, req: HttpRequest, app: TemplatedApp, connection: Connection) {

    logger.info('POST /publish');

    // Header Value: <public_key>
    const publicKey: string = req.getHeader("authorization");

    // Header Value: <nonce>:<signature>
    // signature: nonce;body + secret_key
    const signatureHeader: string = req.getHeader("signature");

    if(!signatureHeader) {
        logger.info('400 /publish');
        res.writeStatus('400');
        res.end(JSON.stringify({
            error: "Invalid signature provided"
        }));
        return;
    }

    const signatureHeaderParts: string[] = signatureHeader.split(':');

    if(signatureHeaderParts.length !== 2) {
        logger.info('400 /publish');
        res.writeStatus('400');
        res.end(JSON.stringify({
            error: "Invalid signature provided"
        }));
        return;
    }

    readJson<PublishDto>(res, async (json: PublishDto) => {
        if (!json.channel.includes('/')) {
            logger.info('400 /publish');
            res.writeStatus('400');
            res.end(JSON.stringify({
                error: "Invalid channel name"
            }));
            return;
        }

        const appId: string = json.channel.substring(0, json.channel.indexOf('/'));

        const apiKey: ApiKey = await connection.getRepository(ApiKey).findOne({
            where: {
                publicKey
            },
            relations: ['application'],
        });
        
        if(!apiKey || apiKey.application.uuid != appId) {
            logger.info('401 /publish');
            res.writeStatus('401');
            res.end(JSON.stringify({
                error: "Invalid application key"
            }));
            return;
        }

        const digest: string = createHmac('sha256', apiKey.secretKey).update(`${signatureHeaderParts[0]};${JSON.stringify(json)}`).digest('hex');

        if(digest !== signatureHeaderParts[1]) {
            logger.info('401 /publish');
            res.writeStatus('401');
            res.end(JSON.stringify({
                error: "Signature not matching payload"
            }));
            return;
        }

        const message: EventMessage = {
            type: 'event',
            payload: {
                channel: json.channel,
                data: json.payload
            }
        }

        if(process.env.CLUSTERED_MODE === "true") {
            publisher.publish("publish_event", {
                channel: json.channel,
                data: JSON.stringify(message)
            });
            totalBytesTransmittedMetric.inc(JSON.stringify(message).length * 2);
        } else {
            app.publish(json.channel, JSON.stringify(message));
        }

        logger.info('202 /publish');
        res.writeStatus("202");
        res.end(JSON.stringify({
            message: "Message queued successfully"
        }));
        return;
    }, console.error);
}