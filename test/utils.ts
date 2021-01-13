import { Connection } from "typeorm";
import Application from "../src/entity/Application";
import ChannelAuth from "../src/entity/ChannelAuth";
import User from "../src/entity/User";
import { v4 as uuid4 } from "uuid";
import { ApiKey } from "../src/entity/ApiKey";

export const createApplication = async (connection: Connection): Promise<{application: Application, key: ApiKey}> => {
    let user: User = new User();
    user.email = "hello@ditsche.dev";
    user.firstName = 'Tobias';
    user.lastName = 'Dittmann';
    user.passwordHash = 'doesntmatter';
    user = await connection.getRepository(User).save(user);

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

export const cleanupDatabase = async (connection: Connection) => {
    await connection.dropDatabase();
    await connection.synchronize();
}

export const preauthorizeSocket = async (connection: Connection, appUuid: string, channel: string, socket: string): Promise<ChannelAuth> => {

    const application: Application = await connection.getRepository(Application).findOne({
        uuid: appUuid
    });

    if(!application) {
        return null;
    }

    const channelAuth: ChannelAuth = new ChannelAuth();
    channelAuth.channel = channel;
    channelAuth.socket = socket;
    channelAuth.application = application;

    return await connection.getRepository(ChannelAuth).save(channelAuth);
}