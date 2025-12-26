import { Global, Module } from '@nestjs/common';
import { KeycloakAuthService } from './keycloak-auth.service';
import { KeycloakConfigService } from './keycloak.service';

@Global()
@Module({
  providers: [KeycloakConfigService, KeycloakAuthService],
  exports: [KeycloakConfigService, KeycloakAuthService],
})
export class KeycloakModule {}
