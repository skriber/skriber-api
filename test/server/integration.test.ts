import SkriberServer from "./../../src/server";
import WebSocket = require("ws");
import { ChallengeMessage, ErrorMessage, IMessage, PingMessage, SubscribeMessage, WelcomeMessage } from "../../src/messages";
import { cleanupDatabase, createApplication, preauthorizeSocket } from "../utils";
import Database from "../../src/db";
import { Connection } from "typeorm";
import Application from "../../src/entity/Application";
import { ApiKey } from "../../src/entity/ApiKey";
import { createServer } from "net";

let server: SkriberServer = undefined;

let database: Database = undefined;

let app: Application = undefined;

let apiKey: ApiKey = undefined;

let port: number = undefined;

function getPort (): Promise<number> {
    return new Promise((resolve, reject) => {
        const server = createServer();
        server.unref();
        server.on('error', reject);
        server.listen(0, () => {
            const { port } = <{ port: number }> server.address();
            server.close(() => {
                resolve(port);
            });
        });
    });
}

beforeAll(done => {
    database = new Database();
    database.connect(async (connection: Connection) => {
        await cleanupDatabase(connection);
        const {application, key} = await createApplication(connection);
        app = application;
        apiKey = key;
        port = await getPort();
        server = new SkriberServer(port);
        server.start(connection, () => done());
    });
});

test('Should allow connections', (done) => {
    try {
        const ws = new WebSocket(`ws://localhost:${port}`);
        ws.on('open', () => {
            expect(true).toBeTruthy();
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
        const ws = new WebSocket(`ws://localhost:${port}`);
        ws.on('open', () => {
            expect(true).toBeTruthy();
            const ping: PingMessage = {
                type: 'ping'
            }
            ws.send(JSON.stringify(ping));
        });
        ws.on('message', (data: string) => {
            const res: IMessage = <IMessage> JSON.parse(data);
            expect(res.type).toBe('pong');
            ws.close();
            done();
        });
    } catch(error) {
        console.error(error);
        expect(false).toBeFalsy();
    }
});

describe('Challenge Message', () => {

    test('Should fail challenge with malformed application key', (done) => {
        try {
            const ws = new WebSocket(`ws://localhost:${port}`);
            ws.on('open', () => {
                const challenge: ChallengeMessage = {
                    type: 'challenge',
                    payload: {
                        application: "not valid",
                        publicKey: "not valid"
                    }
                };
                ws.send(JSON.stringify(challenge));
            });
            ws.on('message', (data: string) => {
                const res: IMessage = <IMessage> JSON.parse(data);
                expect(res.type).toBe('error');
                ws.close();
                done();
            });
        } catch(error) {
            console.error(error);
            expect(false).toBeFalsy();
        }
    });

    test('Should fail challenge with unknown application key', (done) => {
        try {
            const ws = new WebSocket(`ws://localhost:${port}`);
            ws.on('open', () => {
                const challenge: ChallengeMessage = {
                    type: 'challenge',
                    payload: {
                        application: "fd977434-6a47-4f55-b62e-c990c45facd8",
                        publicKey: "not valid"
                    }
                };
                ws.send(JSON.stringify(challenge));
            });
            ws.on('message', (data: string) => {
                const res: IMessage = <IMessage> JSON.parse(data);
                expect(res.type).toBe('error');
                ws.close();
                done();
            });
        } catch(error) {
            console.error(error);
            expect(false).toBeFalsy();
        }
    });

    test('Should accept challenge with valid application and api key', (done) => {
        try {
            const ws = new WebSocket(`ws://localhost:${port}`);
            ws.on('open', () => {
                const challenge: ChallengeMessage = {
                    type: 'challenge',
                    payload: {
                        application: app.uuid,
                        publicKey: apiKey.publicKey
                    }
                };
                ws.send(JSON.stringify(challenge));
            });
            ws.on('message', (data: string) => {
                const res: WelcomeMessage = <WelcomeMessage> JSON.parse(data);
                expect(res.type).toBe('welcome');
                expect(res.payload.socket).not.toBeNull();
                ws.close();
                done();
            });
        } catch(error) {
            console.error(error);
            expect(false).toBeFalsy();
        }
    });

});

describe('Subscribe Message', () => {

    test('Should be able to subscribe to public channel', (done) => {
        try {
            const ws = new WebSocket(`ws://localhost:${port}`);
            let socket: string = undefined;
            ws.on('open', () => {
                const challenge: ChallengeMessage = {
                    type: 'challenge',
                    payload: {
                        application: app.uuid,
                        publicKey: apiKey.publicKey
                    }
                };
                ws.send(JSON.stringify(challenge));
            });
            ws.on('message', (data: string) => {
                const res: IMessage = <IMessage> JSON.parse(data);
                if(res.type === 'welcome') {
                    const message: WelcomeMessage = <WelcomeMessage> res;
                    expect(message.payload.socket).not.toBeNull();
                    socket = message.payload.socket;
                    const sub: SubscribeMessage = {
                        type: 'subscribe',
                        payload: {
                            channel: `${app.uuid}:test.channel`
                        }
                    };
                    ws.send(JSON.stringify(sub));
                } else {
                    expect(res.type).toBe('subscribed');
                    ws.close();
                    done();
                }
            });
        } catch(error) {
            console.error(error);
            expect(false).toBeFalsy();
        }
    });

    test('Should not be able to subscribe to private channel when not preauthorized', (done) => {
        try {
            const ws = new WebSocket(`ws://localhost:${port}`);
            let socket: string = undefined;
            ws.on('open', () => {
                const challenge: ChallengeMessage = {
                    type: 'challenge',
                    payload: {
                        application: app.uuid,
                        publicKey: apiKey.publicKey
                    }
                };
                ws.send(JSON.stringify(challenge));
            });
            ws.on('message', (data: string) => {
                const res: IMessage = <IMessage> JSON.parse(data);
                if(res.type === 'welcome') {
                    const message: WelcomeMessage = <WelcomeMessage> res;
                    expect(message.payload.socket).not.toBeNull();
                    socket = message.payload.socket;
                    const sub: SubscribeMessage = {
                        type: 'subscribe',
                        payload: {
                            channel: `${app.uuid}:test.channel.private`
                        }
                    };
                    ws.send(JSON.stringify(sub));
                } else {
                    expect(res.type).toBe('error');
                    ws.close();
                    done();
                }
            });
        } catch(error) {
            console.error(error);
            expect(false).toBeFalsy();
        }
    });

    test('Should be able to subscribe to private channel when preauthorized', (done) => {
        try {
            const ws = new WebSocket(`ws://localhost:${port}`);
            let socket: string = undefined;
            ws.on('open', () => {
                const challenge: ChallengeMessage = {
                    type: 'challenge',
                    payload: {
                        application: app.uuid,
                        publicKey: apiKey.publicKey
                    }
                };
                ws.send(JSON.stringify(challenge));
            });
            ws.on('message', async (data: string) => {
                const res: IMessage = <IMessage> JSON.parse(data);
                if(res.type === 'welcome') {
                    const message: WelcomeMessage = <WelcomeMessage> res;
                    expect(message.payload.socket).not.toBeNull();
                    socket = message.payload.socket;
                    await preauthorizeSocket(database.connection, app.uuid, 'test.channel.private', socket);
                    const sub: SubscribeMessage = {
                        type: 'subscribe',
                        payload: {
                            channel: `${app.uuid}:test.channel.private`
                        }
                    };
                    ws.send(JSON.stringify(sub));
                } else {
                    expect(res.type).toBe('subscribed');
                    ws.close();
                    done();
                }
            });
        } catch(error) {
            console.error(error);
            expect(false).toBeFalsy();
        }
    });

});

afterAll(async done => {
    await cleanupDatabase(database.connection);
    database.disconnect();
    server.stop(() => done());
});