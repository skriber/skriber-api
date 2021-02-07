import { Connection } from "typeorm";
import { WebSocket } from "uWebSockets.js";
import { ErrorMessage, IMessage, UnsubscribedMessage, UnsubscribeMessage } from "../messages";

export default async function (message: UnsubscribeMessage, ws: WebSocket, connection: Connection): Promise<IMessage> {
    if(ws.unsubscribe(message.payload.channel)) {
        return <UnsubscribedMessage> {
            type: "unsubscribed",
            payload: {
                channel: message.payload.channel
            }
        }
    } else {
        return <ErrorMessage> {
            type: "error",
            payload: {
                error: `Could not unsubscribe from channel "${message.payload.channel}"`
            }
        }
    }
}