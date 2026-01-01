import { Injectable, LoggerService as NestLogger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger, createLogger, format, transports } from 'winston';
import {
  ElasticsearchTransformer,
  ElasticsearchTransport,
  LogData,
  TransformedData,
} from 'winston-elasticsearch';

@Injectable()
export class LoggerService implements NestLogger {
  private readonly logger: Logger;

  constructor(private readonly configService: ConfigService) {
    const esTransformer = (logData: LogData): TransformedData => {
      return ElasticsearchTransformer(logData);
    };

    const isDev =
      this.configService.getOrThrow('app.nodeEnv') === 'development';

    const { combine, timestamp, json, colorize, printf } = format;

    const logFormat = isDev
      ? combine(
          timestamp(),
          colorize(),
          printf(({ timestamp, level, context, message, meta }) => {
            return `[${timestamp}]: ${level} [${context}] ${message} ${meta ? JSON.stringify(meta) : ''}`;
          }),
        )
      : combine(timestamp(), json());

    const options = {
      console: {
        level: 'info',
        handleExceptions: true,
        json: false,
        colorize: true,
      },
      elasticsearch: {
        level: 'info',
        transformer: esTransformer,
        indexPrefix: `${this.configService.getOrThrow('app.name')}-logs`,
        clientOpts: {
          node: this.configService.getOrThrow('elasticsearch.url'),
          log: 'info',
          maxRetries: 2,
          requestTimeout: 10000,
          sniffOnStart: false,
        },
      },
    };
    const esTransport: ElasticsearchTransport = new ElasticsearchTransport(
      options.elasticsearch,
    );

    this.logger = createLogger({
      format: logFormat,
      exitOnError: false,
      transports: [new transports.Console(options.console), esTransport],
    });
  }

  log(message: string, context?: string | object, meta?: any) {
    this.logger.info(message, { context, meta });
  }
  error(
    message: string,
    trace?: string,
    context?: string | object,
    meta?: any,
  ) {
    this.logger.error(message, { trace, context, meta });
  }
  warn(message: string, context?: string | object, meta?: any) {
    this.logger.warn(message, { context, meta });
  }
}
