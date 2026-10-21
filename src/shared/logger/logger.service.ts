import { Injectable, LoggerService as NestLogger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger, createLogger, format, transports } from 'winston';
import {
  ElasticsearchTransformer,
  ElasticsearchTransport,
  LogData,
  TransformedData,
} from 'winston-elasticsearch';

// Logs waiting to reach Elasticsearch while it's down; past this, new ones are
// dropped so the wait can't eat the process's memory
const ES_BUFFER_LIMIT = 1000;

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
        buffering: true,
        bufferLimit: ES_BUFFER_LIMIT,
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
    // straight to the console: logging this through winston would feed the
    // same failing transport
    esTransport.on('error', (error) => {
      console.error('Elasticsearch log transport failed:', error.message);
    });

    this.logger = createLogger({
      format: logFormat,
      exitOnError: false,
      transports: [new transports.Console(options.console), esTransport],
    });
  }

  /**
   * Ensure context is a string for Elasticsearch compatibility
   */
  private normalizeContext(context?: string | object): string | undefined {
    if (context === undefined || context === null) return undefined;
    if (typeof context === 'string') return context;
    return JSON.stringify(context);
  }

  log(message: string, context?: string | object, meta?: any) {
    this.logger.info(message, {
      context: this.normalizeContext(context),
      meta,
    });
  }
  error(
    message: string,
    trace?: string,
    context?: string | object,
    meta?: any,
  ) {
    this.logger.error(message, {
      trace: this.normalizeContext(trace),
      context: this.normalizeContext(context),
      meta,
    });
  }
  warn(message: string, context?: string | object, meta?: any) {
    this.logger.warn(message, {
      context: this.normalizeContext(context),
      meta,
    });
  }
}
