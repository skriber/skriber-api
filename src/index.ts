import {config} from "dotenv";
config();
import {Connection} from "typeorm";
import Database from "./db";
import logger from "./logger";
import SkriberServer from "./server";
import {calculateSignature} from "../test/utils";

const port = parseInt(process.env.PORT) || 9001;

const SKRIBER_LOGO: string =  "\n ______  __  __   ______  __  ______  ______  ______    \n" +
                              "/\\  ___\\/\\ \\/ /  /\\  == \\/\\ \\/\\  == \\/\\  ___\\/\\  == \\   \n" +
                              "\\ \\___  \\ \\  _\"-.\\ \\  __<\\ \\ \\ \\  __<\\ \\  __\\\\ \\  __<   \n" +
                              " \\/\\_____\\ \\_\\ \\_\\\\ \\_\\ \\_\\ \\_\\ \\_____\\ \\_____\\ \\_\\ \\_\\ \n" +
                              "  \\/_____/\\/_/\\/_/ \\/_/ /_/\\/_/\\/_____/\\/_____/\\/_/ /_/ \n" +
                              "                                                        \n" +
                              "\n";

console.log(`\x1b[36m${SKRIBER_LOGO}\x1b[0m`);
logger.info('Starting server..');
logger.info('Connecting to database..');
logger.info(`Starting version ${process.env.npm_package_version}`);

console.log(calculateSignature(JSON.stringify({
    "channel": "8bf987e5-0059-4a9b-91d1-bc72fc05113a/test/channel",
    "payload": {
        "id": 1293242,
        "username": "ditsche",
        "text": "It works!"
    }
}), '65f34ee5-5be0-4623-b531-2c571dbf4934', 'nonce'));

const db: Database = new Database();
const server: SkriberServer = new SkriberServer(port);
db.connect((connection: Connection) => {
    server.start(connection);
});