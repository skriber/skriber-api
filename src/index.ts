import { config } from "dotenv";
config();
import { Connection } from "typeorm";
import Database from "./db";
import logger from "./logger";
import SkriberServer from "./server";

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

const db: Database = new Database();
const server: SkriberServer = new SkriberServer(port);
db.connect((connection: Connection) => {
    server.start(connection);
});