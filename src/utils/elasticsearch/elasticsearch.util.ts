import { Client } from '@elastic/elasticsearch';
import { ClusterHealthResponse } from '@elastic/elasticsearch/lib/api/types';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '@/shared/logger/logger.service';
import { Injectable, OnModuleInit } from '@nestjs/common';

@Injectable()
export class ElasticInit implements OnModuleInit {
  private elasticSearchClient: Client;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  async checkConnection() {
    this.elasticSearchClient = new Client({
      node: this.configService.get('elasticsearch.url'),
    });
    let isConnected = false;
    let retryCount = 0;
    const maxRetries = 10;
    const baseDelay = 1000; // 1 second

    while (!isConnected && retryCount < maxRetries) {
      try {
        const health: ClusterHealthResponse =
          await this.elasticSearchClient.cluster.health({});
        this.logger.log(
          `${this.configService.get('app.name')}'s Elasticsearch Health Status - ${health.status}`,
          'Elasticsearch',
        );
        isConnected = true;
      } catch (error) {
        retryCount++;
        const delay = baseDelay * Math.pow(2, retryCount - 1); // Exponential backoff

        if (retryCount >= maxRetries) {
          this.logger.error(
            `Failed to connect to Elasticsearch after ${maxRetries} attempts`,
            'Elasticsearch',
          );
          throw new Error('Elasticsearch connection timeout');
        }

        this.logger.error(
          `Connection to Elasticsearch failed (attempt ${retryCount}/${maxRetries}). Retrying in ${delay}ms...`,
          'Elasticsearch',
        );
        this.logger.error(
          `Failed to connect to Elasticsearch: ${error}`,
          'Elasticsearch',
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  async onModuleInit() {
    await this.checkConnection();
  }
}
