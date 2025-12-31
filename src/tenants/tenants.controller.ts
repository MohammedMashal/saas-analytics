import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { ApiKeyThrottleGuard } from './guards/throttle.guard';
import { Throttle } from '@nestjs/throttler';

@Controller('tenants')
@UseGuards(ApiKeyThrottleGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  create(@Body() createTenantDto: CreateTenantDto) {
    return this.tenantsService.create(createTenantDto);
  }
}
