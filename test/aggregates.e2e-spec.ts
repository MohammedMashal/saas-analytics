import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';
import { Tenant } from 'src/tenants/entities/tenant.entity';
import { Event } from 'src/events/entities/event.entity';

// Type definitions for API responses
interface CountResponse {
  total: number;
}

interface TypeCountItem {
  type: string;
  total: string;
}

interface TimelineItem {
  date: string;
  total: string;
}

describe('AggregatesController (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let testTenant: Tenant;
  let apiKey: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);

    // Create test tenant
    const tenantRepo = dataSource.getRepository(Tenant);
    testTenant = tenantRepo.create({
      name: 'Test Tenant',
      apiKey: 'test-api-key-' + Date.now(),
    });
    testTenant = await tenantRepo.save(testTenant);
    apiKey = testTenant.apiKey;

    // Create test events
    const eventRepo = dataSource.getRepository(Event);
    const tenantIdNumber = parseInt(testTenant.id);
    const events = [
      {
        tenantId: tenantIdNumber,
        type: 'user.signup',
        occurredAt: new Date('2025-01-01T10:00:00Z'),
        data: { userId: '1', plan: 'free' },
      },
      {
        tenantId: tenantIdNumber,
        type: 'user.signup',
        occurredAt: new Date('2025-01-02T11:00:00Z'),
        data: { userId: '2', plan: 'premium' },
      },
      {
        tenantId: tenantIdNumber,
        type: 'user.login',
        occurredAt: new Date('2025-01-03T12:00:00Z'),
        data: { userId: '1' },
      },
      {
        tenantId: tenantIdNumber,
        type: 'user.login',
        occurredAt: new Date('2025-01-03T14:00:00Z'),
        data: { userId: '2' },
      },
      {
        tenantId: tenantIdNumber,
        type: 'purchase.completed',
        occurredAt: new Date('2025-01-04T15:00:00Z'),
        data: { userId: '1', amount: 99.99, product: 'premium-plan' },
      },
      {
        tenantId: tenantIdNumber,
        type: 'purchase.completed',
        occurredAt: new Date('2025-01-05T16:00:00Z'),
        data: { userId: '2', amount: 199.99, product: 'enterprise-plan' },
      },
    ];

    await eventRepo.save(events);
  });

  afterAll(async () => {
    // Clean up test data
    const eventRepo = dataSource.getRepository(Event);
    const tenantRepo = dataSource.getRepository(Tenant);

    await eventRepo.delete({ tenantId: parseInt(testTenant.id) });
    await tenantRepo.delete({ id: testTenant.id });

    await app.close();
  });

  describe('/analytics/events/count (GET)', () => {
    it('should return total count of all events', () => {
      return request(app.getHttpServer())
        .get('/analytics/events/count')
        .set('x-api-key', apiKey)
        .expect(200)
        .expect((res) => {
          const body = res.body as CountResponse;
          expect(body).toHaveProperty('total');
          expect(body.total).toBe(6);
        });
    });

    it('should filter events by type', () => {
      return request(app.getHttpServer())
        .get('/analytics/events/count')
        .query({ type: 'user.signup' })
        .set('x-api-key', apiKey)
        .expect(200)
        .expect((res) => {
          const body = res.body as CountResponse;
          expect(body.total).toBe(2);
        });
    });

    it('should filter events by date range', () => {
      return request(app.getHttpServer())
        .get('/analytics/events/count')
        .query({
          from: '2025-01-01T00:00:00Z',
          to: '2025-01-02T23:59:59Z',
        })
        .set('x-api-key', apiKey)
        .expect(200)
        .expect((res) => {
          const body = res.body as CountResponse;
          expect(body.total).toBe(2);
        });
    });

    it('should filter by type and date range', () => {
      return request(app.getHttpServer())
        .get('/analytics/events/count')
        .query({
          type: 'user.login',
          from: '2025-01-03T00:00:00Z',
          to: '2025-01-03T23:59:59Z',
        })
        .set('x-api-key', apiKey)
        .expect(200)
        .expect((res) => {
          const body = res.body as CountResponse;
          expect(body.total).toBe(2);
        });
    });

    it('should filter by JSONB data field (exact match)', () => {
      return request(app.getHttpServer())
        .get('/analytics/events/count')
        .query({ 'data.plan': 'premium' })
        .set('x-api-key', apiKey)
        .expect(200)
        .expect((res) => {
          const body = res.body as CountResponse;
          expect(body.total).toBe(1);
        });
    });

    it('should filter by JSONB data field (numeric comparison)', () => {
      return request(app.getHttpServer())
        .get('/analytics/events/count')
        .query({ 'data.amount': '>100' })
        .set('x-api-key', apiKey)
        .expect(200)
        .expect((res) => {
          const body = res.body as CountResponse;
          expect(body.total).toBe(1);
        });
    });

    it('should return 401 without API key', () => {
      return request(app.getHttpServer())
        .get('/analytics/events/count')
        .expect(401);
    });

    it('should return 401 with invalid API key', () => {
      return request(app.getHttpServer())
        .get('/analytics/events/count')
        .set('x-api-key', 'invalid-key')
        .expect(401);
    });

    it('should return 400 for invalid date format', () => {
      return request(app.getHttpServer())
        .get('/analytics/events/count')
        .query({ from: 'invalid-date', to: '2025-01-31T23:59:59Z' })
        .set('x-api-key', apiKey)
        .expect(400);
    });

    it('should return 400 when from date is after to date', () => {
      return request(app.getHttpServer())
        .get('/analytics/events/count')
        .query({
          from: '2025-12-31T23:59:59Z',
          to: '2025-01-01T00:00:00Z',
        })
        .set('x-api-key', apiKey)
        .expect(400);
    });
  });

  describe('/analytics/events/by-type (GET)', () => {
    it('should return event counts grouped by type', () => {
      return request(app.getHttpServer())
        .get('/analytics/events/by-type')
        .set('x-api-key', apiKey)
        .expect(200)
        .expect((res) => {
          const body = res.body as TypeCountItem[];
          expect(Array.isArray(body)).toBe(true);
          expect(body.length).toBe(3);

          const types = body.map((item) => item.type);
          expect(types).toContain('user.signup');
          expect(types).toContain('user.login');
          expect(types).toContain('purchase.completed');

          // Results should be ordered by total DESC
          const totals = body.map((item) => parseInt(item.total));
          const sortedTotals = [...totals].sort((a, b) => b - a);
          expect(totals).toEqual(sortedTotals);
        });
    });

    it('should filter by date range', () => {
      return request(app.getHttpServer())
        .get('/analytics/events/by-type')
        .query({
          from: '2025-01-04T00:00:00Z',
          to: '2025-01-05T23:59:59Z',
        })
        .set('x-api-key', apiKey)
        .expect(200)
        .expect((res) => {
          const body = res.body as TypeCountItem[];
          expect(body.length).toBe(1);
          expect(body[0].type).toBe('purchase.completed');
          expect(parseInt(body[0].total)).toBe(2);
        });
    });

    it('should return empty array when no events match filters', () => {
      return request(app.getHttpServer())
        .get('/analytics/events/by-type')
        .query({
          from: '2025-12-01T00:00:00Z',
          to: '2025-12-31T23:59:59Z',
        })
        .set('x-api-key', apiKey)
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual([]);
        });
    });

    it('should return 401 without API key', () => {
      return request(app.getHttpServer())
        .get('/analytics/events/by-type')
        .expect(401);
    });
  });

  describe('/analytics/events/timeline (GET)', () => {
    it('should return timeline with daily interval by default', () => {
      return request(app.getHttpServer())
        .get('/analytics/events/timeline')
        .set('x-api-key', apiKey)
        .expect(200)
        .expect((res) => {
          const body = res.body as TimelineItem[];
          expect(Array.isArray(body)).toBe(true);
          expect(body.length).toBeGreaterThan(0);

          body.forEach((item) => {
            expect(item).toHaveProperty('date');
            expect(item).toHaveProperty('total');
          });

          // Results should be ordered by date ASC
          const dates = body.map((item) => new Date(item.date));
          const sortedDates = [...dates].sort(
            (a, b) => a.getTime() - b.getTime(),
          );
          expect(dates).toEqual(sortedDates);
        });
    });

    it('should support week interval', () => {
      return request(app.getHttpServer())
        .get('/analytics/events/timeline')
        .query({ interval: 'week' })
        .set('x-api-key', apiKey)
        .expect(200)
        .expect((res) => {
          const body = res.body as TimelineItem[];
          expect(Array.isArray(body)).toBe(true);
        });
    });

    it('should support month interval', () => {
      return request(app.getHttpServer())
        .get('/analytics/events/timeline')
        .query({ interval: 'month' })
        .set('x-api-key', apiKey)
        .expect(200)
        .expect((res) => {
          const body = res.body as TimelineItem[];
          expect(Array.isArray(body)).toBe(true);
        });
    });

    it('should filter by event type', () => {
      return request(app.getHttpServer())
        .get('/analytics/events/timeline')
        .query({ type: 'user.signup' })
        .set('x-api-key', apiKey)
        .expect(200)
        .expect((res) => {
          const body = res.body as TimelineItem[];
          const totalEvents = body.reduce(
            (sum, item) => sum + parseInt(item.total),
            0,
          );
          expect(totalEvents).toBe(2);
        });
    });

    it('should filter by date range', () => {
      return request(app.getHttpServer())
        .get('/analytics/events/timeline')
        .query({
          from: '2025-01-01T00:00:00Z',
          to: '2025-01-03T23:59:59Z',
        })
        .set('x-api-key', apiKey)
        .expect(200)
        .expect((res) => {
          const body = res.body as TimelineItem[];
          const totalEvents = body.reduce(
            (sum, item) => sum + parseInt(item.total),
            0,
          );
          expect(totalEvents).toBe(4);
        });
    });

    it('should return 400 for invalid interval', () => {
      return request(app.getHttpServer())
        .get('/analytics/events/timeline')
        .query({ interval: 'invalid' })
        .set('x-api-key', apiKey)
        .expect(400);
    });

    it('should return 401 without API key', () => {
      return request(app.getHttpServer())
        .get('/analytics/events/timeline')
        .expect(401);
    });

    it('should return empty array when no events match filters', () => {
      return request(app.getHttpServer())
        .get('/analytics/events/timeline')
        .query({
          from: '2025-12-01T00:00:00Z',
          to: '2025-12-31T23:59:59Z',
        })
        .set('x-api-key', apiKey)
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual([]);
        });
    });
  });

  describe('Combined filters', () => {
    it('should handle multiple filters together', () => {
      return request(app.getHttpServer())
        .get('/analytics/events/count')
        .query({
          type: 'purchase.completed',
          from: '2025-01-01T00:00:00Z',
          to: '2025-01-10T23:59:59Z',
          'data.userId': '1',
        })
        .set('x-api-key', apiKey)
        .expect(200)
        .expect((res) => {
          const body = res.body as CountResponse;
          expect(body.total).toBe(1);
        });
    });

    it('should handle JSONB filters with timeline', () => {
      return request(app.getHttpServer())
        .get('/analytics/events/timeline')
        .query({
          'data.plan': 'premium',
          interval: 'day',
        })
        .set('x-api-key', apiKey)
        .expect(200)
        .expect((res) => {
          const body = res.body as TimelineItem[];
          const totalEvents = body.reduce(
            (sum, item) => sum + parseInt(item.total),
            0,
          );
          expect(totalEvents).toBe(1);
        });
    });
  });
});
