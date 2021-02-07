import { Connection } from "typeorm";
import { WebSocket } from "uWebSockets.js";
import { ApiKey } from "../entity/ApiKey";
import logger from "../logger";
import { ChallengeMessage, ErrorMessage, IMessage, WelcomeMessage } from "../messages";

export default async function (message: ChallengeMessage, ws: WebSocket, connection: Connection): Promise<IMessage> {
    logger.info(`Received challenge from Socket >${ws.uuid}<`);

    if(!message.payload.application.match(/^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i)) {
        return <ErrorMessage> {
            type: "error",
            payload: {
                error: "Challenge failed"
            }
        }
    }

    const key: ApiKey = await connection.getRepository(ApiKey).findOne({
        relations: [
            'application'
        ],
        where: {
            publicKey: message.payload.publicKey
        }
    });

    if(!key)
        return <ErrorMessage> {
            type: "error",
            payload: {
                error: "Challenge failed"
            }
        }

    ws.challanged = true;

    logger.info(`Challenge successfull for Socket >${ws.uuid}<`);

    return <WelcomeMessage> {
        type: "welcome",
        payload: {
            socket: ws.uuid
        }
    }

}