import { createHmac } from "crypto";
import { Connection } from "typeorm";
import { isDate } from "util";
import { App, HttpRequest, HttpResponse, TemplatedApp } from "uWebSockets.js";
import { ApiKey } from "../entity/ApiKey";
import logger from "../logger";
import { readJson } from "../utils";

type PublishDto = {
    channel: string;
    payload: any
};

export default async function (res: HttpResponse, req: HttpRequest, app: TemplatedApp, connection: Connection) {

    logger.info('POST /publish');

    // Header Value: <publickey>
    const publicKey: string = req.getHeader("authorization");

    // Header Value: <appId>:<nonce>:<signature>
    const signatureHeader: string = req.getHeader("signature");

    if(!signatureHeader) {
        res.writeStatus('401');
        res.end();
        return;
    }

    const signatureHeaderParts: string[] = signatureHeader.split(':');

    if(signatureHeaderParts.length !== 3) {
        res.writeStatus('401');
        res.end();
        return;
    }

    readJson<PublishDto>(res, async (json: PublishDto) => {
        const keys: ApiKey = await connection.getRepository(ApiKey).findOne({
            publicKey
        });
        
        if(!keys || keys.application.uuid != signatureHeaderParts[0]) {
            res.writeStatus('401');
            res.end();
            return;
        }

        const digest: string = createHmac('sha256', keys.secretKey).update(`${signatureHeaderParts[1]};${JSON.stringify(json)}`).digest('hex');

        logger.debug(digest);

        if(digest !== signatureHeaderParts[2]) {
            res.writeStatus('401');
            res.end();
            return;
        }

        app.publish(signatureHeaderParts[0] + ':' + json.channel, JSON.stringify(json.payload));

        res.writeStatus("202");
        res.end();
    }, console.error);
}