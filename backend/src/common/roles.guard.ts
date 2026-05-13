import { Injectable, CanActivate, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export type AdminRole = 'admin' | 'editor' | 'viewer';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: AdminRole[]) => SetMetadata(ROLES_KEY, roles);

// Resolve the caller's role from the request. In production this would decode
// a JWT or validate a scoped token. For local pilot, it reads x-admin-role
// header (defaults to 'admin' when auth is not enforced).
function resolveRole(request: any): AdminRole {
  const headerRole = request.headers?.['x-admin-role'];
  if (headerRole === 'editor' || headerRole === 'viewer') return headerRole;
  if (typeof headerRole === 'string' && headerRole.length > 0) return 'admin';
  // When REQUIRE_INTERNAL_ADMIN_TOKEN is off, default to admin
  return 'admin';
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AdminRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // no role restriction on this handler
    }
    const request = context.switchToHttp().getRequest();
    const role = resolveRole(request);
    // Attach for audit logging
    if (!request.user) request.user = {};
    request.user.role = role;
    return requiredRoles.includes(role);
  }
}
