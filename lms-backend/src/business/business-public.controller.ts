import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { BusinessService } from './business.service';

@ApiTags('Business (Public)')
@Controller('businesses')
export class BusinessPublicController {
    constructor(private readonly businessService: BusinessService) {}

    @Post('verify-code')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    @ApiOperation({ summary: 'Verify a company signup code (public)' })
    async verifyCode(@Body() body: { code: string }) {
        return this.businessService.verifySignupCode(body.code);
    }

    @Post('join')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @ApiOperation({ summary: 'Request to join a company via signup code (public)' })
    async joinCompany(
        @Body()
        body: {
            company_code: string;
            email: string;
            password: string;
            first_name: string;
            last_name: string;
        },
    ) {
        return this.businessService.joinViaCode(body);
    }
}
