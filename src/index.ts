import { Connection } from "typeorm";
import Database from "./db";
import logger from "./logger";
import SkriberServer from "./server";

const port = parseInt(process.env.PORT) || 9001;

const SKRIBER_LOGO: string =  " \n______  __  __   ______  __  ______  ______  ______    \n" +
                              "/\\  ___\\/\\ \\/ /  /\\  == \\/\\ \\/\\  == \\/\\  ___\\/\\  == \\   \n" +
                              "\\ \\___  \\ \\  _\"-.\\ \\  __<\\ \\ \\ \\  __<\\ \\  __\\\\ \\  __<   \n" +
                              " \\/\\_____\\ \\_\\ \\_\\\\ \\_\\ \\_\\ \\_\\ \\_____\\ \\_____\\ \\_\\ \\_\\ \n" +
                              "  \\/_____/\\/_/\\/_/ \\/_/ /_/\\/_/\\/_____/\\/_____/\\/_/ /_/ \n" +
                              "                                                        \n" +
                              "\n";

console.log(SKRIBER_LOGO);
logger.info('Starting server..');
logger.info('Connecting to database..');

const db: Database = new Database();
const server: SkriberServer = new SkriberServer(port);
db.connect((connection: Connection) => {
    server.start(connection);
});