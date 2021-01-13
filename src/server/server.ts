import "reflect-metadata";
import {Connection} from "typeorm";
import { App, HttpRequest, HttpResponse, SHARED_COMPRESSOR, TemplatedApp, us_listen_socket_close, us_socket_context_t, WebSocket } from "uWebSockets.js";
import { v4 as uuid4 } from 'uuid';
import { ChallengeMessage, ErrorMessage, IMessage, PingMessage, SubscribeMessage, UnsubscribeMessage } from "../messages";
import handleSubscribe from "../handlers/handleSubscribe";
import publishEndpoint from "../endpoints/publishEndpoint";
import publishAuthEndpoint from "../endpoints/publishAuthEndpoint";
import ChannelAuth from "../entity/ChannelAuth";
import logger from "../logger";
import handleChallenge from "../handlers/handleChallenge";
import handleUnsubscribe from "../handlers/handleUnsubscribe";
import handlePing from "../handlers/handlePing";

export default class SkriberServer {

    private port: number;

    private token: any;

    constructor(port: number) {
        this.port = port;
    }

    start(connection: Connection, cb: () => void = undefined) {
      logger.info('Connection to database established');
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
            res.onAborted(() => {
              upgradeAborted.aborted = true;
            });

            const upgradeAborted: { 
              aborted: boolean 
            } = { aborted: false };
            const url: string = req.getUrl();
            const secWebSocketKey: string = req.getHeader('sec-websocket-key');
            const secWebSocketProtocol: string = req.getHeader('sec-websocket-protocol');
            const secWebSocketExtensions: string = req.getHeader('sec-websocket-extensions');
        
            if (upgradeAborted.aborted) {
              logger.error("Connection attempt aborted");
              return;
            }
        
            /* This immediately calls open handler, you must not use res after this call */
            res.upgrade(
              {
                url: url
              },
              secWebSocketKey,
              secWebSocketProtocol,
              secWebSocketExtensions,
              context
            );
          },
          open: (ws: WebSocket) => {
            
            // Bind a random uuid to the socket
            ws.uuid = uuid4();
            ws.challenged = false;
  
            logger.info(`Socket >${ws.uuid}< established a connection`);
        
          },
          message: async (ws: WebSocket, message: ArrayBuffer, isBinary: boolean) => {
            /* Parse this message according to some application
             * protocol such as JSON [action, topic, message] */
        
              const json: IMessage = JSON.parse(Buffer.from(message).toString());
  
              let result: IMessage;
  
              switch(json.type) {
                  case "challenge":
                      result = await handleChallenge(<ChallengeMessage> json, ws, connection);
                      break;
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
        
          },
          close: (ws: WebSocket, code: number, message: ArrayBuffer) => {
            const uuid = ws.uuid;
            connection.getRepository(ChannelAuth).delete({
              socket: uuid
            })
            .then(() => logger.info(`Cleared authorizations for Socket >${uuid}<`))
            .catch(error => logger.error(error));
  
            logger.info(`Socket >${uuid}< gracefully disconnected`);
          }
        }).post('/publish', (res, req) => {
         publishEndpoint(res, req, app, connection);
        }).post('/publish/auth', (res, req) => {
          publishAuthEndpoint(res, req, app, connection);
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
