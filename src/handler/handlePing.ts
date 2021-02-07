import { Connection } from "typeorm";
import { WebSocket } from "uWebSockets.js";
import { IMessage, PingMessage, PongMessage } from "../messages";

export default async function (message: PingMessage, ws: WebSocket, connection: Connection): Promise<IMessage> {
    return <PongMessage> {
        type: "pong"
    }
}