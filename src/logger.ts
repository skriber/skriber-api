import {createLogger, format, transports} from 'winston';
import "winston-daily-rotate-file";

let alignColorsAndTime = format.combine(
    format.colorize({
        all:true
    }),
    format.label({
        label:'[SKRIBER]'
    }),
    format.timestamp({
        format:"YY-MM-DD HH:MM:SS"
    }),
    format.printf(
        info => `${info.label} ${info.timestamp} ${info.level} : ${info.message}`
    )
);

const logger = createLogger({
    level: process.env.LOG_LEVEL ?? 'info',
    format: format.json(),
    transports: [
        new transports.File({ filename: 'error.log', dirname: "./logs", level: 'error' }),
        new transports.DailyRotateFile({
            filename: 'skriber-%DATE%.log',
            dirname: process.env.LOG_DIR ?? "./logs",
            datePattern: "YYYY-MM-DD",
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: process.env.LOG_RETENTION ?? '14d'
        }),
        new transports.Console({
            format: format.combine(format.colorize(), alignColorsAndTime)
        })
    ],
});

if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
    logger.level = 'debug'
}

export default logger;