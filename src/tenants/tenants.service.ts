import { Injectable } from '@nestjs/common';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { Repository } from 'typeorm';
import { Tenant } from './entities/tenant.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant) private readonly tenantsRepo: Repository<Tenant>,
  ) {}
  async create(createTenantDto: CreateTenantDto) {
    const apiKey = this.generateApiKey();

    const tenant = this.tenantsRepo.create({
      name: createTenantDto.name,
      apiKey,
    });
    await this.tenantsRepo.save(tenant);
    return {
      id: tenant.id,
      apiKey,
    };
  }

  async findByApiKey(apiKey: string) {
    return await this.tenantsRepo.findOneBy({ apiKey });
  }

  private generateApiKey() {
    return `${randomBytes(32).toString('hex')}`;
  }
}
