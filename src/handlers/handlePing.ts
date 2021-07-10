import {Connection} from "typeorm";
import {WebSocket} from "uWebSockets.js";
import {IMessage, PingMessage, PongMessage} from "../messages";

export async function handlePing(message: PingMessage, ws: WebSocket, connection: Connection): Promise<IMessage> {
    return <PongMessage>{
        type: "pong"
    }
}