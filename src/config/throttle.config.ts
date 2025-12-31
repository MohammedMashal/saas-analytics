import { registerAs } from '@nestjs/config';

export default registerAs('throttle', () => ({
  // Default rate limit: 100 requests per 60 seconds per tenant
  default: {
    ttl: 60000, // 60 seconds in milliseconds
    limit: 100,
  },
  // Event ingestion endpoints: Higher limit due to bulk operations
  events: {
    ttl: 60000,
    limit: 1000, // Allow up to 1000 requests/minute for high-volume ingestion
  },
  // Analytics endpoints: Standard limit
  analytics: {
    ttl: 60000,
    limit: 100,
  },
}));
