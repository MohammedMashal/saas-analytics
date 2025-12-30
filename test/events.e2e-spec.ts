import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';
import { Tenant } from 'src/tenants/entities/tenant.entity';
import { Event } from 'src/events/entities/event.entity';

interface EventResponse {
  id: number;
  type: string;
  occurredAt: string;
  data: Record<string, unknown>;
  tenantId: number;
  createdAt: string;
}

describe('EventsController (e2e)', () => {
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
      name: 'Test Tenant Events',
      apiKey: 'test-events-key-' + Date.now(),
    });
    testTenant = await tenantRepo.save(testTenant);
    apiKey = testTenant.apiKey;
  });

  afterAll(async () => {
    // Clean up test data
    const eventRepo = dataSource.getRepository(Event);
    const tenantRepo = dataSource.getRepository(Tenant);

    await eventRepo.delete({ tenantId: parseInt(testTenant.id) });
    await tenantRepo.delete({ id: testTenant.id });

    await app.close();
  });

  describe('/events (POST)', () => {
    it('should create a single event successfully', () => {
      const eventData = {
        type: 'user.signup',
        occurredAt: new Date().toISOString(),
        data: {
          userId: 'user-123',
          email: 'test@example.com',
          plan: 'free',
        },
      };

      return request(app.getHttpServer())
        .post('/events')
        .set('x-api-key', apiKey)
        .send(eventData)
        .expect(201)
        .expect((res) => {
          const body = res.body as EventResponse;
          expect(body).toHaveProperty('id');
          expect(body.type).toBe(eventData.type);
          expect(body.data).toEqual(eventData.data);
        });
    });

    it('should create event with complex nested data', () => {
      const eventData = {
        type: 'purchase.completed',
        occurredAt: new Date().toISOString(),
        data: {
          orderId: 'order-456',
          items: [
            { id: 'item-1', price: 99.99 },
            { id: 'item-2', price: 49.99 },
          ],
          total: 149.98,
          metadata: {
            source: 'web',
            campaign: 'summer-sale',
          },
        },
      };

      return request(app.getHttpServer())
        .post('/events')
        .set('x-api-key', apiKey)
        .send(eventData)
        .expect(201)
        .expect((res) => {
          const body = res.body as EventResponse;
          expect(body.data).toEqual(eventData.data);
        });
    });

    it('should return 401 without API key', () => {
      const eventData = {
        type: 'user.login',
        occurredAt: new Date().toISOString(),
        data: { userId: 'user-123' },
      };

      return request(app.getHttpServer())
        .post('/events')
        .send(eventData)
        .expect(401);
    });

    it('should return 401 with invalid API key', () => {
      const eventData = {
        type: 'user.login',
        occurredAt: new Date().toISOString(),
        data: { userId: 'user-123' },
      };

      return request(app.getHttpServer())
        .post('/events')
        .set('x-api-key', 'invalid-key')
        .send(eventData)
        .expect(401);
    });

    it('should return 400 for missing type', () => {
      const eventData = {
        occurredAt: new Date().toISOString(),
        data: { userId: 'user-123' },
      };

      return request(app.getHttpServer())
        .post('/events')
        .set('x-api-key', apiKey)
        .send(eventData)
        .expect(400);
    });

    it('should return 400 for missing data', () => {
      const eventData = {
        type: 'user.login',
        occurredAt: new Date().toISOString(),
      };

      return request(app.getHttpServer())
        .post('/events')
        .set('x-api-key', apiKey)
        .send(eventData)
        .expect(400);
    });

    it('should return 400 for invalid date format', () => {
      const eventData = {
        type: 'user.login',
        occurredAt: 'invalid-date',
        data: { userId: 'user-123' },
      };

      return request(app.getHttpServer())
        .post('/events')
        .set('x-api-key', apiKey)
        .send(eventData)
        .expect(400);
    });

    it('should return 400 for empty type string', () => {
      const eventData = {
        type: '',
        occurredAt: new Date().toISOString(),
        data: { userId: 'user-123' },
      };

      return request(app.getHttpServer())
        .post('/events')
        .set('x-api-key', apiKey)
        .send(eventData)
        .expect(400);
    });

    it('should return 400 for non-object data', () => {
      const eventData = {
        type: 'user.login',
        occurredAt: new Date().toISOString(),
        data: 'invalid-data',
      };

      return request(app.getHttpServer())
        .post('/events')
        .set('x-api-key', apiKey)
        .send(eventData)
        .expect(400);
    });
  });

  describe('/events/bulk (POST)', () => {
    it('should create multiple events successfully', () => {
      const bulkData = {
        events: [
          {
            type: 'page.view',
            occurredAt: new Date().toISOString(),
            data: { url: '/home', duration: 5000 },
          },
          {
            type: 'page.view',
            occurredAt: new Date().toISOString(),
            data: { url: '/pricing', duration: 3000 },
          },
          {
            type: 'button.click',
            occurredAt: new Date().toISOString(),
            data: { buttonId: 'cta-signup' },
          },
        ],
      };

      return request(app.getHttpServer())
        .post('/events/bulk')
        .set('x-api-key', apiKey)
        .send(bulkData)
        .expect(201)
        .expect((res) => {
          const body = res.body as EventResponse[];
          expect(Array.isArray(body)).toBe(true);
          expect(body).toHaveLength(3);
          expect(body[0]).toHaveProperty('id');
          expect(body[1]).toHaveProperty('id');
          expect(body[2]).toHaveProperty('id');
        });
    });

    it('should handle large batch of events', () => {
      const events = Array.from({ length: 50 }, (_, i) => ({
        type: 'metric.recorded',
        occurredAt: new Date().toISOString(),
        data: { metricName: 'cpu_usage', value: Math.random() * 100, index: i },
      }));

      return request(app.getHttpServer())
        .post('/events/bulk')
        .set('x-api-key', apiKey)
        .send({ events })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveLength(50);
        });
    });

    it('should return 401 without API key', () => {
      const bulkData = {
        events: [
          {
            type: 'test.event',
            occurredAt: new Date().toISOString(),
            data: { test: true },
          },
        ],
      };

      return request(app.getHttpServer())
        .post('/events/bulk')
        .send(bulkData)
        .expect(401);
    });

    it('should return 400 for empty events array', () => {
      return request(app.getHttpServer())
        .post('/events/bulk')
        .set('x-api-key', apiKey)
        .send({ events: [] })
        .expect(400);
    });

    it('should return 400 if one event is invalid', () => {
      const bulkData = {
        events: [
          {
            type: 'valid.event',
            occurredAt: new Date().toISOString(),
            data: { valid: true },
          },
          {
            type: '', // Invalid: empty type
            occurredAt: new Date().toISOString(),
            data: { invalid: true },
          },
        ],
      };

      return request(app.getHttpServer())
        .post('/events/bulk')
        .set('x-api-key', apiKey)
        .send(bulkData)
        .expect(400);
    });

    it('should return 400 for missing events property', () => {
      return request(app.getHttpServer())
        .post('/events/bulk')
        .set('x-api-key', apiKey)
        .send({})
        .expect(400);
    });

    it('should return 400 for non-array events', () => {
      return request(app.getHttpServer())
        .post('/events/bulk')
        .set('x-api-key', apiKey)
        .send({ events: 'not-an-array' })
        .expect(400);
    });
  });

  describe('Event persistence', () => {
    it('should persist events and be queryable', async () => {
      const eventData = {
        type: 'test.persistence',
        occurredAt: new Date().toISOString(),
        data: { testId: 'persistence-test-' + Date.now() },
      };

      const response = await request(app.getHttpServer())
        .post('/events')
        .set('x-api-key', apiKey)
        .send(eventData)
        .expect(201);

      const eventId = (response.body as EventResponse).id;

      // Verify event is persisted in database
      const eventRepo = dataSource.getRepository(Event);
      const savedEvent = await eventRepo.findOne({ where: { id: eventId } });

      expect(savedEvent).toBeDefined();
      expect(savedEvent?.type).toBe(eventData.type);
      expect(savedEvent?.data).toEqual(eventData.data);
    });

    it('should associate events with correct tenant', async () => {
      const eventData = {
        type: 'tenant.association.test',
        occurredAt: new Date().toISOString(),
        data: { test: 'tenant-association' },
      };

      const response = await request(app.getHttpServer())
        .post('/events')
        .set('x-api-key', apiKey)
        .send(eventData)
        .expect(201);

      const eventRepo = dataSource.getRepository(Event);
      const savedEvent = await eventRepo.findOne({
        where: { id: (response.body as EventResponse).id },
        relations: ['tenant'],
      });

      expect(savedEvent?.tenant.id).toBe(testTenant.id);
      expect(savedEvent?.tenantId).toBe(parseInt(testTenant.id));
    });
  });
});
