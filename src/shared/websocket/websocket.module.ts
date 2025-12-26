import { DynamicModule, Global, Module } from '@nestjs/common';
import {
  WebSocketOptions,
  WebSocketOptionsAsync,
} from '@/common/interfaces/websocket.interface';
import { WEBSOCKET_CONFIGURATION_OPTIONS } from '@/constants/websocket.constant';
import { PresenceService } from './presence.service';
import { WebSocketGateway } from './websocket.gateway';
import { WebSocketService } from './websocket.service';

/**
 * Global WebSocket module providing Socket.IO functionality with Redis adapter
 * KeycloakAuthService is provided globally from KeycloakModule
 */
@Global()
@Module({
  providers: [WebSocketService, WebSocketGateway, PresenceService],
  exports: [WebSocketService, WebSocketGateway, PresenceService],
})
export class WebSocketModule {
  static forRoot(options: WebSocketOptions): DynamicModule {
    const websocketModuleOptions = {
      provide: WEBSOCKET_CONFIGURATION_OPTIONS,
      useValue: options,
    };

    return {
      module: WebSocketModule,
      providers: [websocketModuleOptions, PresenceService],
      exports: [WebSocketService, WebSocketGateway, PresenceService],
    };
  }

  static forRootAsync(options: WebSocketOptionsAsync): DynamicModule {
    const websocketModuleOptions = {
      provide: WEBSOCKET_CONFIGURATION_OPTIONS,
      useFactory: options.useFactory,
      inject: options.inject || [],
    };

    return {
      module: WebSocketModule,
      imports: options.imports || [],
      providers: [websocketModuleOptions, PresenceService],
      exports: [WebSocketService, WebSocketGateway, PresenceService],
    };
  }
}
