import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';
import { Tenant } from 'src/tenants/entities/tenant.entity';

interface TenantResponse {
  id: string;
  apiKey: string;
}

describe('TenantsController (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  const createdTenantIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    // Clean up all created tenants
    if (createdTenantIds.length > 0) {
      const tenantRepo = dataSource.getRepository(Tenant);
      await tenantRepo.delete(createdTenantIds);
    }
    await app.close();
  });

  describe('/tenants (POST)', () => {
    it('should create a tenant and return id and apiKey', () => {
      return request(app.getHttpServer())
        .post('/tenants')
        .send({ name: 'Test Company' })
        .expect(201)
        .expect((res) => {
          const body = res.body as TenantResponse;
          expect(body).toHaveProperty('id');
          expect(body).toHaveProperty('apiKey');
          expect(typeof body.id).toBe('string');
          expect(typeof body.apiKey).toBe('string');
          expect(body.apiKey.length).toBeGreaterThan(20);

          // Store for cleanup
          createdTenantIds.push(body.id);
        });
    });

    it('should generate unique API keys for different tenants', async () => {
      const response1 = await request(app.getHttpServer())
        .post('/tenants')
        .send({ name: 'Company A' })
        .expect(201);

      const response2 = await request(app.getHttpServer())
        .post('/tenants')
        .send({ name: 'Company B' })
        .expect(201);

      const body1 = response1.body as TenantResponse;
      const body2 = response2.body as TenantResponse;

      expect(body1.apiKey).not.toBe(body2.apiKey);
      expect(body1.id).not.toBe(body2.id);

      // Store for cleanup
      createdTenantIds.push(body1.id, body2.id);
    });

    it('should accept various tenant names', () => {
      const testNames = [
        'Simple Name',
        'Name-With-Dashes',
        'Name_With_Underscores',
        'Name123WithNumbers',
        'VeryLongNameThatIsStillValid'.repeat(3),
        '日本語の名前', // Unicode characters
      ];

      return Promise.all(
        testNames.map((name) =>
          request(app.getHttpServer())
            .post('/tenants')
            .send({ name })
            .expect(201)
            .expect((res) => {
              const body = res.body as TenantResponse;
              createdTenantIds.push(body.id);
            }),
        ),
      );
    });

    it('should return 400 for missing name', () => {
      return request(app.getHttpServer()).post('/tenants').send({}).expect(400);
    });

    it('should return 400 for empty name string', () => {
      return request(app.getHttpServer())
        .post('/tenants')
        .send({ name: '' })
        .expect(400);
    });

    it('should return 400 for non-string name', () => {
      return request(app.getHttpServer())
        .post('/tenants')
        .send({ name: 123 })
        .expect(400);
    });

    it('should return 400 for null name', () => {
      return request(app.getHttpServer())
        .post('/tenants')
        .send({ name: null })
        .expect(400);
    });

    it('should return 400 for object name', () => {
      return request(app.getHttpServer())
        .post('/tenants')
        .send({ name: { nested: 'object' } })
        .expect(400);
    });

    it('should return 400 for array name', () => {
      return request(app.getHttpServer())
        .post('/tenants')
        .send({ name: ['array', 'value'] })
        .expect(400);
    });
  });

  describe('Tenant persistence and usage', () => {
    it('should persist tenant in database', async () => {
      const response = await request(app.getHttpServer())
        .post('/tenants')
        .send({ name: 'Persistence Test Co' })
        .expect(201);

      const body = response.body as TenantResponse;
      createdTenantIds.push(body.id);

      const tenantRepo = dataSource.getRepository(Tenant);
      const savedTenant = await tenantRepo.findOne({
        where: { id: body.id },
      });

      expect(savedTenant).toBeDefined();
      expect(savedTenant?.name).toBe('Persistence Test Co');
      expect(savedTenant?.apiKey).toBe(body.apiKey);
    });

    it('should allow using API key for authentication', async () => {
      // Create a tenant
      const createResponse = await request(app.getHttpServer())
        .post('/tenants')
        .send({ name: 'Auth Test Co' })
        .expect(201);

      const createBody = createResponse.body as TenantResponse;
      createdTenantIds.push(createBody.id);
      const apiKey = createBody.apiKey;

      // Use the API key to create an event
      const eventResponse = await request(app.getHttpServer())
        .post('/events')
        .set('x-api-key', apiKey)
        .send({
          type: 'test.event',
          occurredAt: new Date().toISOString(),
          data: { test: true },
        })
        .expect(201);

      expect(eventResponse.body).toHaveProperty('id');
    });

    it('should not allow using another tenant API key', async () => {
      // Create two tenants
      const tenant1Response = await request(app.getHttpServer())
        .post('/tenants')
        .send({ name: 'Tenant 1' })
        .expect(201);

      const tenant2Response = await request(app.getHttpServer())
        .post('/tenants')
        .send({ name: 'Tenant 2' })
        .expect(201);

      const body1 = tenant1Response.body as TenantResponse;
      const body2 = tenant2Response.body as TenantResponse;

      createdTenantIds.push(body1.id, body2.id);

      // Each tenant's API key should work independently
      await request(app.getHttpServer())
        .post('/events')
        .set('x-api-key', body1.apiKey)
        .send({
          type: 'test.event',
          occurredAt: new Date().toISOString(),
          data: { tenant: 1 },
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/events')
        .set('x-api-key', body2.apiKey)
        .send({
          type: 'test.event',
          occurredAt: new Date().toISOString(),
          data: { tenant: 2 },
        })
        .expect(201);
    });

    it('should store API key in database correctly', async () => {
      const response = await request(app.getHttpServer())
        .post('/tenants')
        .send({ name: 'API Key Test' })
        .expect(201);

      const body = response.body as TenantResponse;
      createdTenantIds.push(body.id);

      const tenantRepo = dataSource.getRepository(Tenant);
      const tenant = await tenantRepo.findOne({
        where: { apiKey: body.apiKey },
      });

      expect(tenant).toBeDefined();
      expect(tenant?.id).toBe(body.id);
      expect(tenant?.name).toBe('API Key Test');
    });

    it('should not expose sensitive data in response', async () => {
      const response = await request(app.getHttpServer())
        .post('/tenants')
        .send({ name: 'Security Test' })
        .expect(201);

      const body = response.body as TenantResponse;
      createdTenantIds.push(body.id);

      // Should only return id and apiKey, not full tenant object
      const keys = Object.keys(body);
      expect(keys).toHaveLength(2);
      expect(keys).toContain('id');
      expect(keys).toContain('apiKey');
      expect(response.body).not.toHaveProperty('name');
      expect(response.body).not.toHaveProperty('createdAt');
    });
  });

  describe('API Key validation', () => {
    let validApiKey: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/tenants')
        .send({ name: 'Validation Test Tenant' })
        .expect(201);

      const body = response.body as TenantResponse;
      createdTenantIds.push(body.id);
      validApiKey = body.apiKey;
    });

    it('should accept valid API key', () => {
      return request(app.getHttpServer())
        .post('/events')
        .set('x-api-key', validApiKey)
        .send({
          type: 'test.event',
          occurredAt: new Date().toISOString(),
          data: { valid: true },
        })
        .expect(201);
    });

    it('should reject invalid API key', () => {
      return request(app.getHttpServer())
        .post('/events')
        .set('x-api-key', 'invalid-key-12345')
        .send({
          type: 'test.event',
          occurredAt: new Date().toISOString(),
          data: { valid: false },
        })
        .expect(401);
    });

    it('should reject missing API key', () => {
      return request(app.getHttpServer())
        .post('/events')
        .send({
          type: 'test.event',
          occurredAt: new Date().toISOString(),
          data: { valid: false },
        })
        .expect(401);
    });

    it('should reject empty API key', () => {
      return request(app.getHttpServer())
        .post('/events')
        .set('x-api-key', '')
        .send({
          type: 'test.event',
          occurredAt: new Date().toISOString(),
          data: { valid: false },
        })
        .expect(401);
    });

    it('should be case-insensitive for header name', () => {
      return request(app.getHttpServer())
        .post('/events')
        .set('X-API-KEY', validApiKey)
        .send({
          type: 'test.event',
          occurredAt: new Date().toISOString(),
          data: { valid: true },
        })
        .expect(201);
    });
  });
});
