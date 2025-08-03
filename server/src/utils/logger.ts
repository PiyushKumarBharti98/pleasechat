import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { Request } from 'express';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} [${level}]: ${stack || message}`;
});

// Base logger configuration
const logger = winston.createLogger({
    level: 'info',
    format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        logFormat
    ),
    transports: [
        // Console transport (colored output)
        new winston.transports.Console({
            format: combine(
                colorize(),
                logFormat
            )
        }),
        // Daily rotating file transport for errors
        new DailyRotateFile({
            filename: 'logs/error-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d',
            level: 'error'
        }),
        // Daily rotating file transport for all logs
        new DailyRotateFile({
            filename: 'logs/combined-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d'
        })
    ],
    exceptionHandlers: [
        new DailyRotateFile({
            filename: 'logs/exceptions-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d'
        })
    ]
});

// If we're not in production, log debug-level messages to console
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        level: 'debug',
        format: combine(
            colorize(),
            logFormat
        )
    }));
}

// Utility function to log HTTP requests
export const httpLogger = (req: Request, res: any, next: Function) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.http(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
    });

    next();
};

// Utility function to log API errors with request context
export const logApiError = (error: Error, req: Request, message: string = 'API Error') => {
    logger.error({
        message,
        error: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method,
        body: req.body,
        params: req.params,
        query: req.query,
        user: (req as any).user?._id || 'anonymous'
    });
};

export default logger;
