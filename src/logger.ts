import { createLogger, format, transports } from 'winston';
import "winston-daily-rotate-file";

const logger = createLogger({
    level: 'info',
    format: format.json(),
    transports: [
        new transports.File({ filename: 'error.log', dirname: "./logs", level: 'error' }),
        new transports.DailyRotateFile({
            filename: 'wss-%DATE%.log',
            dirname: "./logs",
            datePattern: "YYYY-MM-DD",
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d'
        })
    ],
});

if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
    logger.add(new transports.Console({
        format: format.simple(),
    }));
}

export default logger;