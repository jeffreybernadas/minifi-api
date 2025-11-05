import { DynamicModule, Global, Module } from '@nestjs/common';
import {
  ResendOptions,
  ResendOptionsAsync,
} from '@/common/interfaces/resend.interface';
import { RESEND_CONFIGURATION_OPTIONS } from '@/constants/resend.constant';
import { ResendService } from './resend.service';

@Global()
@Module({
  providers: [ResendService],
  exports: [ResendService],
})
export class ResendModule {
  static forRoot(options: ResendOptions): DynamicModule {
    const resendModuleOptions = {
      provide: RESEND_CONFIGURATION_OPTIONS,
      useValue: options,
    };

    return {
      module: ResendModule,
      providers: [resendModuleOptions],
      exports: [ResendService],
    };
  }

  static forRootAsync(options: ResendOptionsAsync): DynamicModule {
    const resendModuleOptions = {
      provide: RESEND_CONFIGURATION_OPTIONS,
      useFactory: options.useFactory,
      inject: options.inject || [],
    };

    return {
      module: ResendModule,
      imports: options.imports,
      providers: [resendModuleOptions],
      exports: [ResendService],
    };
  }
}
