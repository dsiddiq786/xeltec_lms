import {
    Controller,
    Get,
    Post,
    Delete,
    Param,
    Body,
    UseGuards,
} from '@nestjs/common';
import { FeatureFlagsService } from './feature-flags.service';
import { UpsertFeatureFlagDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators';

@Controller('feature-flags')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class FeatureFlagsController {
    constructor(private readonly featureFlagsService: FeatureFlagsService) { }

    @Get()
    @RequirePermission('MANAGE_FEATURE_FLAGS')
    async findAll() {
        return this.featureFlagsService.findAll();
    }

    @Post()
    @RequirePermission('MANAGE_FEATURE_FLAGS')
    async upsert(@Body() dto: UpsertFeatureFlagDto) {
        return this.featureFlagsService.upsert(dto.key, dto.enabled);
    }

    @Delete(':key')
    @RequirePermission('MANAGE_FEATURE_FLAGS')
    async remove(@Param('key') key: string) {
        return this.featureFlagsService.remove(key);
    }
}
