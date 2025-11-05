import { DynamicModule, Global, Module } from '@nestjs/common';
import {
  WebSocketOptions,
  WebSocketOptionsAsync,
} from '@/common/interfaces/websocket.interface';
import { WEBSOCKET_CONFIGURATION_OPTIONS } from '@/constants/websocket.constant';
import { WebSocketService } from './websocket.service';
import { WebSocketGateway } from './websocket.gateway';

/**
 * Global WebSocket module providing Socket.IO functionality with Redis adapter
 */
@Global()
@Module({
  providers: [WebSocketService, WebSocketGateway],
  exports: [WebSocketService, WebSocketGateway],
})
export class WebSocketModule {
  static forRoot(options: WebSocketOptions): DynamicModule {
    const websocketModuleOptions = {
      provide: WEBSOCKET_CONFIGURATION_OPTIONS,
      useValue: options,
    };

    return {
      module: WebSocketModule,
      providers: [websocketModuleOptions],
      exports: [WebSocketService, WebSocketGateway],
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
      imports: options.imports,
      providers: [websocketModuleOptions],
      exports: [WebSocketService, WebSocketGateway],
    };
  }
}
