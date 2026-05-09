import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class AdminTokenGuard implements CanActivate {
  private readonly logger = new Logger(AdminTokenGuard.name);
  private readonly requiredToken: string | undefined;
  private readonly enabled: boolean;

  constructor() {
    this.requiredToken = process.env.INTERNAL_ADMIN_TOKEN;
    this.enabled = process.env.REQUIRE_INTERNAL_ADMIN_TOKEN === 'true';

    if (!this.enabled) {
      this.logger.warn(
        'REQUIRE_INTERNAL_ADMIN_TOKEN is not true. Internal admin endpoints are unprotected. ' +
        'Set INTERNAL_ADMIN_TOKEN and REQUIRE_INTERNAL_ADMIN_TOKEN=true for beta/production.'
      );
    }
  }

  canActivate(
    context: ExecutionContext
  ): boolean | Promise<boolean> | Observable<boolean> {
    if (!this.enabled) {
      return true;
    }

    if (!this.requiredToken) {
      this.logger.error(
        'REQUIRE_INTERNAL_ADMIN_TOKEN=true but INTERNAL_ADMIN_TOKEN is not set. Blocking request.'
      );
      return false;
    }

    const request = context.switchToHttp().getRequest();
    const token = request.headers['x-internal-admin-token'];

    if (token !== this.requiredToken) {
      return false;
    }

    return true;
  }
}
