import "reflect-metadata";
import {Connection} from "typeorm";
import { App, HttpRequest, HttpResponse, SHARED_COMPRESSOR, TemplatedApp, us_listen_socket_close, us_socket_context_t, WebSocket } from "uWebSockets.js";
import { v4 as uuid4 } from 'uuid';
import { ChallengeMessage, ErrorMessage, IMessage, PingMessage, SubscribeMessage, UnsubscribeMessage, WelcomeMessage } from "../messages";
import handleSubscribe from "../handler/handleSubscribe";
import publishEndpoint from "../endpoints/publishEndpoint";
import publishAuthEndpoint from "../endpoints/publishAuthEndpoint";
import logger from "../logger";
import handleUnsubscribe from "../handler/handleUnsubscribe";
import handlePing from "../handler/handlePing";
import Application from "../entity/Application";
import User from "../entity/User";
import InstanceInfo from "../entity/InstanceInfo";

export default class SkriberServer {

    private port: number;

    private token: any;

    constructor(port: number) {
        this.port = port;
    }

    async start(connection: Connection, cb: () => void = undefined) {
      logger.info('Connection to database established');

      let instanceInfo: InstanceInfo = await connection.getRepository(InstanceInfo).findOne();
      if(!instanceInfo) {
        logger.info("First application start, generating instance information from environment");
        instanceInfo = new InstanceInfo();
        instanceInfo.baseurl = "localhost:9000";
        instanceInfo.maxPayloadSize = 2000000;
        await connection.getRepository(InstanceInfo).save(instanceInfo);
        logger.info("Instance information updated");
      }

      const app: TemplatedApp = App({
          //key_file_name: 'misc/key.pem',
          //cert_file_name: 'misc/cert.pem',
          //passphrase: '1234'
        }).ws('/*', {
          compression: SHARED_COMPRESSOR,
          maxPayloadLength: 16 * 1024 * 1024,
          idleTimeout: 10,
          maxBackpressure: 1024,
        
          /* Handlers */
          upgrade: (res: HttpResponse, req: HttpRequest, context: us_socket_context_t) => {
            const query: { [key: string]: any; }  = JSON.parse('{"' + req.getQuery().replace(/&/g, '","').replace(/=/g,'":"') + '"}', function(key, value) { return key===""?value:decodeURIComponent(value) });

            const url: string = req.getUrl();
            const secWebSocketKey: string = req.getHeader('sec-websocket-key');
            const secWebSocketProtocol: string = req.getHeader('sec-websocket-protocol');
            const secWebSocketExtensions: string = req.getHeader('sec-websocket-extensions');

            if(!query.appId || !query.publicKey) {
              logger.error(`Received invalid connection params ${req.getQuery()}`);
              return;
            }

            const upgradeAborted: { 
              aborted: boolean 
            } = { aborted: false };

            res.onAborted(() => {
              upgradeAborted.aborted = true;
            });

            connection.getRepository(Application).findOne({
              uuid: query.appId
            }).then((application: Application) => {
              if(!application) {
                logger.error(`No application found with id ${query.appId}`);
                return;
              }
          
              if (upgradeAborted.aborted) {
                logger.error("Connection attempt aborted");
                return;
              }
  
              res.upgrade(
                {
                  url: url
                },
                secWebSocketKey,
                secWebSocketProtocol,
                secWebSocketExtensions,
                context
              );
            })

            
          },
          open: (ws: WebSocket) => {
            ws.uuid = uuid4();
  
            logger.info(`Socket >${ws.uuid}< established a connection`);

            const message: WelcomeMessage = {
              type: "welcome",
              payload: {
                socketId: ws.uuid
              }
            };

            ws.send(JSON.stringify(message));

          },
          message: async (ws: WebSocket, message: ArrayBuffer, isBinary: boolean) => {
            /* Parse this message according to some application
             * protocol such as JSON [action, topic, message] */
        
              const json: IMessage = JSON.parse(Buffer.from(message).toString());
              let result: IMessage;
  
              switch(json.type) {
                  case "subscribe":
                      result = await handleSubscribe(<SubscribeMessage> json, ws, connection);
                      break;
                  case "unsubscribe":
                      result = await handleUnsubscribe(<UnsubscribeMessage> json, ws, connection);
                      break;
                  case "ping":
                      result = await handlePing(<PingMessage> json, ws, connection);
                      break;
                  default:
                      result = <ErrorMessage> {
                          type: "error",
                          payload: {
                            error: "Unsupported action received"
                          }
                      };
                      break;
              }
  
              ws.send(JSON.stringify(result));
          },
          drain: (ws) => {
            // TODO: Implement drain
          },
          close: (ws: WebSocket, code: number, message: ArrayBuffer) => {
            const uuid = ws.uuid;
            logger.info(`Socket >${uuid}< gracefully disconnected`);
          }
        }).post('/publish', async (res, req) => {
          res.onAborted(() => {
            res.aborted = true;
          });
          await publishEndpoint(res, req, app, connection);
        }).any('/*', (res, req) => {
          res.end('Nothing to see here!');
        }).listen(this.port, (token) => {
          if (token) {
            logger.info('Server started on port ' + this.port);
            logger.info('Waiting for requests..');
            this.token = token;
            if(cb) {
                cb();
            }
          } else {
            logger.error('Failed to listen to port ' + this.port);
          }
          token
        });
    }

    stop(cb: () => void = undefined) {
        logger.info('Shutting down server..')
        us_listen_socket_close(this.token);
        this.token = null;
        logger.info('Server gracefully shut down');
        if(cb) {
            cb();
        }
    }
}
