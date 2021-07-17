import "reflect-metadata";
import {Connection} from "typeorm";
import {
    App,
    HttpRequest,
    HttpResponse,
    SHARED_COMPRESSOR,
    TemplatedApp,
    us_listen_socket_close,
    us_socket_context_t,
    us_socket_local_port,
    WebSocket
} from "uWebSockets.js";
import {
    ConnectionEstablishedMessage,
    ErrorMessage,
    IMessage,
    PingMessage,
    SubscribeMessage,
    UnsubscribeMessage
} from "../messages";
import logger from "../logger";
import validator from "validator";
import {publishEndpoint} from "../endpoints";
import {handlePing, handleSubscribe, handleUnsubscribe} from "../handlers";
import isUUID = validator.isUUID;
import {parseQueryString} from "../utils";
import {Application, InstanceInfo} from "../entities";
import {subscriber} from "../redis";
import {nanoid} from "nanoid";
import {
    currentConnectionsMetric,
    getMetrics, totalBytesReceivedMetric, totalBytesTransmittedMetric,
    totalConnectionsMetric,
    totalDisconnectsMetric, totalEventsEmittedMetric
} from "../metrics";

export class SkriberServer {

    private _port: number;

    private token: any;

    private clients: WebSocket[];

    constructor(port: number) {
        this._port = port;
        this.clients = [];
    }

    get port() {
        return this._port;
    }

    async start(connection: Connection, cb: () => void = undefined) {
        logger.info('Connection to database established');

        let instanceInfo: InstanceInfo = await connection.getRepository(InstanceInfo).findOne();
        if (!instanceInfo) {
            logger.info("First application start, generating instance information from environment");
            instanceInfo = new InstanceInfo();
            instanceInfo.baseurl = "localhost:9000";
            instanceInfo.maxPayloadSize = 2000000;
            await connection.getRepository(InstanceInfo).save(instanceInfo);
            logger.info("Instance information updated");
        }

        const app: TemplatedApp = App().ws('/*', {
            compression: SHARED_COMPRESSOR,
            maxPayloadLength: 16 * 1024 * 1024,
            idleTimeout: 60,
            maxBackpressure: 1024,

            /* Handlers */
            upgrade: (res: HttpResponse, req: HttpRequest, context: us_socket_context_t) => {
                const query: { [key: string]: any; } = parseQueryString(req.getQuery());

                const url: string = req.getUrl();
                const secWebSocketKey: string = req.getHeader('sec-websocket-key');
                const secWebSocketProtocol: string = req.getHeader('sec-websocket-protocol');
                const secWebSocketExtensions: string = req.getHeader('sec-websocket-extensions');

                const upgradeAborted: {
                    aborted: boolean
                } = {aborted: false};

                res.onAborted(() => {
                    upgradeAborted.aborted = true;
                });

                if (!query.appId || !isUUID(query.appId) || !query.publicKey) {
                    logger.error(`Received invalid connection params ${req.getQuery()}`);
                    res.writeStatus("400");
                    res.end(JSON.stringify({
                        error: "Received invalid connection params"
                    }));
                    return;
                }

                connection.getRepository(Application).findOne({
                    uuid: query.appId
                }, {
                    relations: ["keys"]
                }).then((application: Application) => {
                    if (!application) {
                        logger.error(`No application found with id ${query.appId}`);
                        res.writeStatus("400");
                        res.end(JSON.stringify({
                            error: "Received invalid connection params"
                        }));
                        return;
                    }

                    if(!application.keys.some(key => key.publicKey == query.publicKey)) {
                        logger.error(`Invalid public key ${query.publicKey}`);
                        res.writeStatus("400");
                        res.end(JSON.stringify({
                            error: "Received invalid connection params"
                        }));
                        return;
                    }

                    if (upgradeAborted.aborted) {
                        logger.error("Connection attempt aborted");
                        return;
                    }

                    res.upgrade(
                        {
                            url: url,
                            appId: query.appId
                        },
                        secWebSocketKey,
                        secWebSocketProtocol,
                        secWebSocketExtensions,
                        context
                    );
                });
            },
            open: (ws: WebSocket) => {
                ws.id = nanoid();
                logger.info(`Socket >${ws.id}< established a connection`);

                const message: ConnectionEstablishedMessage = {
                    type: "connection_established",
                    payload: {
                        socketId: ws.id
                    }
                };

                this.clients.push(ws);
                currentConnectionsMetric.inc();
                totalConnectionsMetric.inc();

                totalBytesTransmittedMetric.inc(JSON.stringify(message).length * 2);
                ws.send(JSON.stringify(message));
            },
            message: async (ws: WebSocket, message: ArrayBuffer) => {
                const json: IMessage = JSON.parse(Buffer.from(message).toString());
                let result: IMessage;

                totalBytesReceivedMetric.inc(message.byteLength);

                switch (json.type) {
                    case "subscribe":
                        result = await handleSubscribe(<SubscribeMessage>json, ws, connection);
                        break;
                    case "unsubscribe":
                        result = await handleUnsubscribe(<UnsubscribeMessage>json, ws, connection);
                        break;
                    case "ping":
                        result = await handlePing(<PingMessage>json, ws, connection);
                        break;
                    default:
                        result = <ErrorMessage>{
                            type: "error",
                            payload: {
                                error: "Unsupported action received"
                            }
                        };
                        break;
                }
                // 2 bytes for each char
                totalBytesTransmittedMetric.inc(JSON.stringify(result).length * 2);
                ws.send(JSON.stringify(result));
            },
            drain: (ws) => {
                logger.info(`Socket >${ws.id}< built up backpressure of ${ws.getBufferedAmount()}`);
            },
            close: (ws: WebSocket, code: number, message: ArrayBuffer) => {
                this.clients = this.clients.filter(c => c.id !== ws.id);
                currentConnectionsMetric.dec();
                totalDisconnectsMetric.inc();
                logger.info(`Socket >${ws.id}< closed connection`);
            }
        }).post('/publish', async (res, req) => {
            res.onAborted(() => {
                res.aborted = true;
            });
            try {
                await publishEndpoint(res, req, app, connection);
            } catch (e) {
                res.writeStatus('500');
                res.end(JSON.stringify({
                    error: e
                }));
                return;
            }
        }).get('/metrics', async (res, req) => {
            res.onAborted(() => {
                res.aborted = true;
            });
            const metrics = await getMetrics();
            res.writeStatus('200');
            res.end(metrics);
        }).any('/*', (res, req) => {
            res.writeStatus('200');
            res.end(JSON.stringify({
                version: process.env.npm_package_version,
                status: 'healthy'
            }))
        }).listen(this.port, (token) => {
            if (token) {
                this._port = us_socket_local_port(token);
                logger.info('Server started on port ' + this.port);
                logger.info('Waiting for requests..');
                this.token = token;
                if (cb) {
                    cb();
                }
            } else {
                logger.error('Failed to listen to port ' + this.port);
            }
        });

        // Setup redis for distributed cluster mode
        if(process.env.CLUSTERED_MODE === "true") {
            subscriber.subscribe("publish_event", (data) => {
                logger.info(`Publishing to topic ${data.channel} : ${JSON.stringify(data.data)}`);
                totalBytesTransmittedMetric.inc(JSON.stringify(data.data).length * 2);
                totalEventsEmittedMetric.inc();
                app.publish(data.channel, data.data);
            });
        }
    }

    stop(cb: () => void = undefined) {
        logger.info('Shutting down server..')
        us_listen_socket_close(this.token);
        this.token = null;
        logger.info('Server gracefully shut down');
        if (cb) {
            cb();
        }
    }
}
