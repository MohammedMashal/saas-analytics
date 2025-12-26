import { TenantContext } from 'src/tenants/types/tenant-context.type';

declare global {
  namespace Express {
    interface Request {
      tenant?: TenantContext;
    }
  }
}
