import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { TenantsService } from '../tenants.service';
import { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly tenantsService: TenantsService) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>();
    const apiKey = req.get('X-API-KEY');
    if (!apiKey) throw new UnauthorizedException('API KEY is missing');
    const tenant = await this.tenantsService.findByApiKey(apiKey);
    if (!tenant) throw new UnauthorizedException('Invalid API KEY');
    req.tenant = tenant;
    return true;
  }
}
