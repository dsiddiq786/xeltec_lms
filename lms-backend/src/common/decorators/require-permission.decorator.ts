import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'permission';

/**
 * Decorator to require a specific permission on a controller method.
 * Usage: @RequirePermission('COURSE_PUBLISH')
 */
export const RequirePermission = (permission: string) =>
    SetMetadata(PERMISSION_KEY, permission);
