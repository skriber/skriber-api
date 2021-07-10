import {Connection, createConnection} from "typeorm";
import logger from "../logger";
import {DataType, newDb} from "pg-mem";
import {v4} from 'uuid';

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

    mock(cb: (connection: Connection) => void) {
        if(this.connection) {
            cb(this.connection);
            return;
        }

        const database = newDb({
            autoCreateForeignKeyIndices: true
        });

        database.registerExtension('uuid-ossp', (schema) => {
            schema.registerFunction({
                name: 'uuid_generate_v4',
                returns: DataType.uuid,
                implementation: v4,
                impure: true,
            });
        });

        database.adapters.createTypeormConnection({
            type: 'postgres',
            entities: [
                './src/entities/**/*.ts'
            ]
        }).then(async (connection: Connection) => {
            await connection.synchronize();
            logger.info("Table synchronized");
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