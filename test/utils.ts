import { Connection } from "typeorm";
import {v4 as uuid} from "uuid";
import {Application, User, ApiKey} from "../src/entities";
import {nanoid} from "nanoid";
import {createHmac} from "crypto";
import fetch, {Response} from "node-fetch";

export const createApplication = async (connection: Connection): Promise<{application: Application, key: ApiKey}> => {
    let user: User = new User();
    user.email = "hello@ditsche.dev";
    user.username = 'ditsche';
    user.firstName = 'Tobias';
    user.lastName = 'Dittmann';
    user.passwordHash = 'doesntmatter';
    const userRepository = await connection.getRepository(User);
    await userRepository.save(user);

    let application: Application = new Application();
    application.appName = 'Testing';
    application.user = user;
    application = await connection.getRepository(Application).save(application);

    let key: ApiKey = new ApiKey();
    key.regenerate();
    key.deactivated = null;
    key.application = application;
    key = await connection.getRepository(ApiKey).save(key);

    return {application, key};
};

export async function publish(url: string, channel: string, payload: any, publicKey: string, secret: string): Promise<Response> {
    const body = JSON.stringify({
        channel,
        payload
    });

    const nonce: string = generateNonce();
    const signature: string = calculateSignature(body, secret, nonce);

    return await fetch(url, {
        method: 'POST',
        headers: {
            'authorization': publicKey,
            'signature': nonce + ':' + signature
        },
        body
    });
}

export function calculateSignature(body: string, secret: string, nonce: string) {
    return createHmac('sha256', secret).update(`${nonce};${body}`).digest('hex');
}

export function preauthSocket(uuid: string, channel: string, secretKey: string) {
    return createHmac('sha256', secretKey).update(`${uuid};${channel}`).digest('hex');
}

export function generateNonce(): string {
    return nanoid(12);
}

export const cleanupDatabase = async (connection: Connection) => {
    await connection.dropDatabase();
    await connection.synchronize();
}