import { config } from "dotenv";
config();
import SkriberServer from "./../../src/server";
import WebSocket = require("ws");
import {calculateSignature, cleanupDatabase, createApplication, generateNonce, preauthSocket, publish} from "../utils";
import Database from "../../src/db";
import { Connection } from "typeorm";
import fetch from 'node-fetch';
import {Application, ApiKey} from "../../src/entities";
import {ConnectionEstablishedMessage, ErrorMessage, IMessage, PingMessage, SubscribeMessage} from "../../src/messages";
import {nanoid} from "nanoid";

let server: SkriberServer = undefined;

let database: Database = undefined;

let app: Application = undefined;

let apiKey: ApiKey = undefined;

let port: number = undefined;

let connectionUrl: string = "";

beforeAll(done => {
    database = new Database();
    database.mock(async (connection: Connection) => {
        const {application, key} = await createApplication(connection);
        app = application;
        apiKey = key;
        server = new SkriberServer(0);
        await server.start(connection, () => {
            port = server.getPort();
            connectionUrl = `ws://localhost:${port}?appId=${app.uuid}&publicKey=${apiKey.publicKey}`;
            done();
        });
    });
});

test('Should allow connections', (done) => {
    try {

        const ws = new WebSocket(connectionUrl);
        ws.on('open', () => {
            expect(true).toBeTruthy();
            ws.close();
            done();
        });
    } catch(error) {
        console.error(error);
        expect(false).toBeTruthy();
        done();
    }
    // expect(false).toBeFalsy();
    // done();
});

test('Should send socket id after connect', (done) => {
    try {
        const ws = new WebSocket(`ws://localhost:${port}?appId=${app.uuid}&publicKey=${apiKey.publicKey}`);
        ws.on('open', () => {
            expect(true).toBeTruthy();
        });
        ws.on('message', (data: string) => {
            const res: IMessage = <IMessage> JSON.parse(data);
            expect(res.type).toBe('connection_established');
            expect((<ConnectionEstablishedMessage> res).payload.socketId).not.toBeNull();
            ws.close();
            done();
        });
    } catch(error) {
        console.error(error);
        expect(false).toBeFalsy();
    }
});

test('Should react to ping with pong', (done) => {
    try {
        const ws = new WebSocket(`ws://localhost:${port}?appId=${app.uuid}&publicKey=${apiKey.publicKey}`);
        ws.on('open', () => {
            expect(true).toBeTruthy();
            const ping: PingMessage = {
                type: 'ping'
            }
            ws.send(JSON.stringify(ping));
        });
        ws.on('message', (data: string) => {
            const res: IMessage = <IMessage> JSON.parse(data);
            if(res.type === 'connection_established') {
                return;
            }
            expect(res.type).toBe('pong');
            ws.close();
            done();
        });
    } catch(error) {
        console.error(error);
        expect(true).toBeFalsy();
        done();
    }
});

describe('Endpoints', () => {

    test('Should respond 200 with valid credentials and body', async () => {

        const body = {
            channel: `${app.uuid}/test/topic`,
            payload: {
                test: '123456'
            }
        }

        const nonce: string = generateNonce();
        const signature: string = calculateSignature(JSON.stringify(body), apiKey.secretKey, nonce);

        const res = await fetch(`http://localhost:${port}/publish`, {
            method: 'POST',
            headers: {
                'authorization': apiKey.publicKey,
                'signature': nonce + ':' + signature
            },
            body: JSON.stringify(body)
        });

        expect(res.status).toBe(202);
    });

    test('Should respond 401 with invalid channel name', async () => {

        const res = await publish(`http://localhost:${port}/publish`, nanoid() + "/test", {}, apiKey.publicKey, apiKey.secretKey)

        expect(res.status).toBe(401);
    });

    test('Should respond 401 with invalid publicKey', async () => {

        const res = await publish(`http://localhost:${port}/publish`, app.uuid + "/test", {}, nanoid(), apiKey.secretKey)

        expect(res.status).toBe(401);
    });

    test('Should respond 401 with invalid secretKey', async () => {

        const res = await publish(`http://localhost:${port}/publish`, app.uuid + "/test", {}, apiKey.publicKey, nanoid())

        expect(res.status).toBe(401);
    });

    test('Should respond 401 with invalid channel name format', async () => {

        const res = await publish(`http://localhost:${port}/publish`, app.uuid + "/test.b", {}, apiKey.publicKey, nanoid())

        expect(res.status).toBe(401);
    });

});

describe('Public channels', () => {

    test('Should be able to subscribe to public channel', (done) => {
        try {
            const ws = new WebSocket(`ws://localhost:${port}?appId=${app.uuid}&publicKey=${apiKey.publicKey}`);
            let socket: string = undefined;
            ws.on('open', () => {

            });
            ws.on('message', (data: string) => {
                const res: IMessage = <IMessage>JSON.parse(data);
                if (res.type === 'connection_established') {
                    const message: ConnectionEstablishedMessage = (<ConnectionEstablishedMessage>res);
                    expect(message.payload.socketId).not.toBeNull();
                    socket = message.payload.socketId;
                    const sub: SubscribeMessage = {
                        type: 'subscribe',
                        payload: {
                            channel: `${app.uuid}/test/channel`
                        }
                    };
                    ws.send(JSON.stringify(sub));
                } else {
                    expect(res.type).toBe('subscription_success');
                    ws.close();
                    done();
                }
            });
        } catch (error) {
            console.error(error);
            expect(false).toBeFalsy();
        }
    });

    test('Should receive message from subscribed public channel', (done) => {
        try {
            const ws = new WebSocket(`ws://localhost:${port}?appId=${app.uuid}&publicKey=${apiKey.publicKey}`);
            let socket: string = undefined;

            const channelName = `${app.uuid}/test/channel`;

            ws.on('message', async (data: string) => {
                const res: IMessage = <IMessage>JSON.parse(data);
                if (res.type === 'connection_established') {
                    const message: ConnectionEstablishedMessage = (<ConnectionEstablishedMessage>res);
                    expect(message.payload.socketId).not.toBeNull();
                    socket = message.payload.socketId;
                    const sub: SubscribeMessage = {
                        type: 'subscribe',
                        payload: {
                            channel: channelName
                        }
                    };
                    ws.send(JSON.stringify(sub));
                } else if (res.type === 'subscription_success') {

                    publish(`http://localhost:${port}/publish`, channelName, {
                        key: 'value'
                    }, apiKey.publicKey, apiKey.secretKey);

                } else {
                    expect(res.type).toBe('event');
                    ws.close();
                    done();
                }
            });
        } catch (error) {
            console.error(error);
            expect(false).toBeFalsy();
        }
    });

});

describe('Private channels', () => {

    test('Should not be able to subscribe without authorization signature', (done) => {
        try {
            const ws = new WebSocket(`ws://localhost:${port}?appId=${app.uuid}&publicKey=${apiKey.publicKey}`);
            let socket: string = undefined;
            ws.on('open', () => {

            });
            ws.on('message', (data: string) => {
                const res: IMessage = <IMessage>JSON.parse(data);
                if (res.type === 'connection_established') {
                    const message: ConnectionEstablishedMessage = (<ConnectionEstablishedMessage>res);
                    expect(message.payload.socketId).not.toBeNull();
                    socket = message.payload.socketId;
                    const sub: SubscribeMessage = {
                        type: 'subscribe',
                        payload: {
                            channel: `${app.uuid}/test/channel/private`
                        }
                    };
                    ws.send(JSON.stringify(sub));
                } else {
                    expect(res.type).toBe('error');
                    expect((<ErrorMessage> res).payload.error).toContain("Not authorized to subscribe to channel");
                    ws.close();
                    done();
                }
            });
        } catch (error) {
            expect(false).toBeFalsy();
        }
    });

    test('Should not be able to subscribe to private channel when not preauthorized', (done) => {
        try {
            const ws = new WebSocket(`ws://localhost:${port}?appId=${app.uuid}&publicKey=${apiKey.publicKey}`);
            let socket: string = undefined;
            ws.on('open', () => {

            });
            ws.on('message', (data: string) => {
                const res: IMessage = <IMessage>JSON.parse(data);
                if (res.type === 'connection_established') {
                    const message: ConnectionEstablishedMessage = (<ConnectionEstablishedMessage>res);
                    expect(message.payload.socketId).not.toBeNull();
                    socket = message.payload.socketId;
                    const sub: SubscribeMessage = {
                        type: 'subscribe',
                        payload: {
                            channel: `${app.uuid}/test/channel/private`,
                            signature: nanoid()
                        }
                    };
                    ws.send(JSON.stringify(sub));
                } else {
                    expect(res.type).toBe('error');
                    expect((<ErrorMessage> res).payload.error).toContain("Not authorized to subscribe to channel");
                    ws.close();
                    done();
                }
            });
        } catch (error) {
            expect(false).toBeFalsy();
        }
    });

    test('Should be able to subscribe to private channel with valid signature', (done) => {
        try {
            const ws = new WebSocket(`ws://localhost:${port}?appId=${app.uuid}&publicKey=${apiKey.publicKey}`);
            let socket: string = undefined;

            const channelName = `${app.uuid}/test/channel/private`;

            ws.on('message', (data: string) => {
                const res: IMessage = <IMessage>JSON.parse(data);
                if (res.type === 'connection_established') {
                    const message: ConnectionEstablishedMessage = (<ConnectionEstablishedMessage>res);
                    expect(message.payload.socketId).not.toBeNull();
                    socket = message.payload.socketId;

                    const signature = apiKey.publicKey + ':' + preauthSocket(socket, channelName, apiKey.secretKey);

                    const sub: SubscribeMessage = {
                        type: 'subscribe',
                        payload: {
                            channel: channelName,
                            signature: signature
                        }
                    };
                    ws.send(JSON.stringify(sub));
                } else {
                    expect(res.type).toBe('subscription_success');
                    ws.close();
                    done();
                }
            });
        } catch (error) {
            expect(false).toBeFalsy();
        }
    });

})

//     // test('Should be able to subscribe to private channel when preauthorized', (done) => {
//     //     try {
//     //         const ws = new WebSocket(`ws://localhost:${port}`);
//     //         let socket: string = undefined;
//     //         ws.on('open', () => {
//     //             const challenge: ChallengeMessage = {
//     //                 type: 'challenge',
//     //                 payload: {
//     //                     application: app.uuid,
//     //                     publicKey: apiKey.publicKey
//     //                 }
//     //             };
//     //             ws.send(JSON.stringify(challenge));
//     //         });
//     //         ws.on('message', async (data: string) => {
//     //             const res: IMessage = <IMessage> JSON.parse(data);
//     //             if(res.type === 'welcome') {
//     //                 const message: WelcomeMessage = <WelcomeMessage> res;
//     //                 expect(message.payload.socket).not.toBeNull();
//     //                 socket = message.payload.socket;
//     //                 await preauthorizeSocket(database.connection, app.uuid, 'test.channel.private', socket);
//     //                 const sub: SubscribeMessage = {
//     //                     type: 'subscribe',
//     //                     payload: {
//     //                         channel: `${app.uuid}:test.channel.private`
//     //                     }
//     //                 };
//     //                 ws.send(JSON.stringify(sub));
//     //             } else {
//     //                 expect(res.type).toBe('subscribed');
//     //                 ws.close();
//     //                 done();
//     //             }
//     //         });
//     //     } catch(error) {
//     //         console.error(error);
//     //         expect(false).toBeFalsy();
//     //     }
//     // });

// });

afterAll(async done => {
    //await cleanupDatabase(database.connection);
    //database.connection.getRepository(Application).remove(app);
    database.disconnect();
    server.stop(() => done());
});