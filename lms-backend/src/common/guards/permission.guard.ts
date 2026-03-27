import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { PERMISSIONS } from '../../config/permissions.config';

/**
 * Guard that checks if the authenticated user's role
 * has the required permission set via @RequirePermission().
 */
@Injectable()
export class PermissionGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredPermission = this.reflector.getAllAndOverride<string>(
            PERMISSION_KEY,
            [context.getHandler(), context.getClass()],
        );

        // No permission set → allow (public or JWT-only route)
        if (!requiredPermission) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user || !user.role) {
            throw new ForbiddenException('Authentication required');
        }

        const allowedRoles = PERMISSIONS[requiredPermission];
        if (!allowedRoles) {
            throw new ForbiddenException(`Unknown permission: ${requiredPermission}`);
        }

        if (!allowedRoles.includes(user.role)) {
            throw new ForbiddenException('Insufficient permissions');
        }

        return true;
    }
}
