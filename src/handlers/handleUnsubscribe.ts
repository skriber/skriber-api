import {Connection} from "typeorm";
import {WebSocket} from "uWebSockets.js";
import {ErrorMessage, IMessage, UnsubscribeMessage} from "../messages";

export async function handleUnsubscribe(message: UnsubscribeMessage, ws: WebSocket, connection: Connection): Promise<IMessage> {
    if (ws.unsubscribe(message.payload.channel)) {
        return <UnsubscribeMessage>{
            type: "unsubscribe",
            payload: {
                channel: message.payload.channel
            }
        }
    } else {
        return <ErrorMessage>{
            type: "error",
            payload: {
                error: `Could not unsubscribe from channel "${message.payload.channel}"`
            }
        }
    }
}