import {createHmac} from "crypto";
import {Connection} from "typeorm";
import {HttpRequest, HttpResponse, TemplatedApp} from "uWebSockets.js";
import {ApiKey} from "../entities";
import logger from "../logger";
import {readJson} from "../utils";
import {EventMessage} from "../messages";

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
        res.writeStatus('401');
        res.end();
        return;
    }

    const signatureHeaderParts: string[] = signatureHeader.split(':');

    if(signatureHeaderParts.length !== 2) {
        res.writeStatus('401');
        res.end();
        return;
    }

    readJson<PublishDto>(res, async (json: PublishDto) => {
        if (!json.channel.includes('/')) {
            res.writeStatus('401');
            res.end();
            return;
        }

        const appId: string = json.channel.substring(0, json.channel.indexOf('/'));

        const apiKey: ApiKey = await connection.getRepository(ApiKey).findOne({
            where: {
                publicKey
            },
            relations: ['application']
        });
        
        if(!apiKey || apiKey.application.uuid != appId) {
            res.writeStatus('401');
            res.end();
            return;
        }

        const digest: string = createHmac('sha256', apiKey.secretKey).update(`${signatureHeaderParts[0]};${JSON.stringify(json)}`).digest('hex');

        if(digest !== signatureHeaderParts[1]) {
            res.writeStatus('401');
            res.end();
            return;
        }

        logger.info(`Publishing to topic ${json.channel} : ${JSON.stringify(json.payload)}`);

        const message: EventMessage = {
            type: 'event',
            payload: {
                channel: json.channel,
                data: json.payload
            }
        }

        app.publish(json.channel, JSON.stringify(message));

        res.writeStatus("202");
        res.end();
    }, console.error);
}