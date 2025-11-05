import { LoggerService } from '@/shared/logger/logger.service';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as apm from 'elastic-apm-node';

@Injectable()
export class ApmInit implements OnModuleInit {
  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  initializeApm(): apm.Agent | null {
    // Only start APM if explicitly enabled via environment variable
    if (this.configService.get('elasticsearch.apmEnable') === '0') {
      this.logger.log(
        'APM is disabled. Set ELASTIC_APM_ENABLE=1 to enable it.',
        'APM',
      );
      return null;
    }

    try {
      const agent = apm.start({
        serviceName: this.configService.get('app.name'),
        serverUrl: this.configService.get('elasticsearch.apmUrl'),
        secretToken: this.configService.get('elasticsearch.apmSecret'),
        environment:
          this.configService.get('app.NODE_ENV') === 'development'
            ? 'development'
            : 'production',
        active: true,
        captureBody: 'all',
        errorOnAbortedRequests: true,
        verifyServerCert: false,
        serviceVersion: '1.0.0',
        captureErrorLogStackTraces: 'always',
      });

      this.logger.log(
        `APM agent started for service: ${this.configService.get('app.name')}`,
        'APM',
      );
      return agent;
    } catch (error) {
      this.logger.error(`Failed to start APM agent: ${error}`, 'APM');
      return null;
    }
  }

  onModuleInit() {
    this.initializeApm();
  }
}
