import { Connection, createConnection } from "typeorm";
import logger from "../logger";

export default class Database {

    public connection: Connection;

    connect(cb: (connection: Connection) => void) {
        if(this.connection) {
            cb(this.connection);
            return;
        }
        createConnection().then((connection: Connection) => {
            this.connection = connection;
            cb(connection);
        })
        .catch(error => {
            console.log(error)
            logger.error(error)
        });
    }

    disconnect() {
        this.connection.close();
    }

}