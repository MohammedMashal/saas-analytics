import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';

/**
 * Custom throttler guard that applies rate limits per tenant/API key
 * instead of per IP address, providing better rate limiting for API clients
 */
@Injectable()
export class ApiKeyThrottleGuard extends ThrottlerGuard {
  protected async getTracker(req: Request): Promise<string> {
    // Use tenant ID as the key for rate limiting instead of IP
    // This ensures rate limits are per-tenant/API-key, not per-IP
    if (req.tenant?.id) {
      return `tenant_${req.tenant.id}`;
    }

    // Fallback to IP if no tenant (for unauthenticated endpoints)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-return,@typescript-eslint/no-unsafe-member-access
    return await super.getTracker(req);
  }
}
