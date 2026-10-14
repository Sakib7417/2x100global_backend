import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

const logDir = process.env.LOG_DIR || 'logs';

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
  })
);

// Create daily rotate file transports
const createDailyRotateTransport = (filename: string, level: string) => {
  return new DailyRotateFile({
    filename: path.join(logDir, filename),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d',
    level,
    format: logFormat,
  });
};

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // API logs
    createDailyRotateTransport(process.env.LOG_FILE_API || 'api-%DATE%.log', 'info'),
    
    // Error logs
    createDailyRotateTransport(process.env.LOG_FILE_ERROR || 'error-%DATE%.log', 'error'),
    
    // Trade logs
    createDailyRotateTransport(process.env.LOG_FILE_TRADE || 'trade-%DATE%.log', 'info'),
    
    // Blockchain logs
    createDailyRotateTransport(process.env.LOG_FILE_BLOCKCHAIN || 'blockchain-%DATE%.log', 'info'),
    
    // Cron logs
    createDailyRotateTransport(process.env.LOG_FILE_CRON || 'cron-%DATE%.log', 'info'),
    
    // Security logs
    createDailyRotateTransport(process.env.LOG_FILE_SECURITY || 'security-%DATE%.log', 'warn'),
  ],
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
  }));
}

export default logger;
