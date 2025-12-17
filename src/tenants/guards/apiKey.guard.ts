import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { TenantsService } from '../tenants.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly tenantsService: TenantsService) {}
  async canActivate(context: ExecutionContext) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const req = context.switchToHttp().getRequest();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const apiKey: string = req.headers['x-api-key'];
    if (!apiKey) throw new UnauthorizedException('API KEY is missing');
    const tenant = await this.tenantsService.findByApiKey(apiKey);
    if (!tenant) throw new UnauthorizedException('Invalid API KEY');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    req.tenant = tenant;
    return true;
  }
}
