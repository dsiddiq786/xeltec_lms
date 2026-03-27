import {
    Controller,
    Get,
    Param,
    Patch,
    Post,
    Delete,
    Body,
    Query,
    UseGuards,
    ParseIntPipe,
    DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission, CurrentUser } from '../common/decorators';

@ApiTags('Users')
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Patch('profile')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update my profile' })
    async updateProfile(
        @CurrentUser('sub') userId: string,
        @Body() dto: UpdateProfileDto,
    ) {
        return this.usersService.updateProfile(userId, dto);
    }

    @Post('change-password')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Change my password' })
    async changePassword(
        @CurrentUser('sub') userId: string,
        @Body() dto: ChangePasswordDto,
    ) {
        return this.usersService.changePassword(userId, dto.current_password, dto.new_password);
    }

    @Get()
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('MANAGE_USERS')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'List all users (admin)' })
    async findAll(
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    ) {
        const safePage = Math.max(1, page);
        const safeLimit = Math.min(Math.max(1, limit), 100);
        return this.usersService.findAll(safePage, safeLimit);
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('MANAGE_USERS')
    @ApiBearerAuth()
    async findOne(@Param('id') id: string) {
        return this.usersService.findById(id);
    }

    @Patch(':id/toggle-active')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('MANAGE_USERS')
    @ApiBearerAuth()
    async toggleActive(@Param('id') id: string) {
        return this.usersService.toggleActive(id);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('MANAGE_USERS')
    @ApiBearerAuth()
    async remove(@Param('id') id: string) {
        return this.usersService.softDelete(id);
    }
}
