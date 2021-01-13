import { Connection } from "typeorm";
import { HttpRequest, HttpResponse, TemplatedApp } from "uWebSockets.js";

export default function (res: HttpResponse, req: HttpRequest, app: TemplatedApp, connection: Connection) {
    // check api credentials
    // Authorize socket for channel
    // Save to db
}