import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';
import { Tenant } from 'src/tenants/entities/tenant.entity';
import { EventSummary } from 'src/summaries/entities/event-summary.entity';
import { SummaryPeriod } from 'src/summaries/types/summary-period.enum';

describe('SummariesController (e2e)', () => {
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

    const tenantRepo = dataSource.getRepository(Tenant);
    testTenant = tenantRepo.create({
      name: 'Test Summaries Tenant',
      apiKey: 'test-summaries-' + Date.now(),
    });
    testTenant = await tenantRepo.save(testTenant);
    apiKey = testTenant.apiKey;
  });

  afterAll(async () => {
    const summaryRepo = dataSource.getRepository(EventSummary);
    const tenantRepo = dataSource.getRepository(Tenant);

    await summaryRepo.delete({ tenantId: testTenant.id });
    await tenantRepo.delete({ id: testTenant.id });

    await app.close();
  });

  describe('/summaries (GET)', () => {
    beforeEach(async () => {
      const summaryRepo = dataSource.getRepository(EventSummary);
      await summaryRepo.delete({ tenantId: testTenant.id });
    });

    it('should return summary when data exists', async () => {
      const summaryRepo = dataSource.getRepository(EventSummary);
      const testDate = new Date('2024-01-01T00:00:00Z');

      const summary = summaryRepo.create({
        tenant: testTenant,
        metric: 'user.signup',
        periodType: SummaryPeriod.DAY,
        periodStart: testDate,
        value: 42,
      });
      await summaryRepo.save(summary);

      return request(app.getHttpServer())
        .get('/summaries')
        .set('x-api-key', apiKey)
        .query({
          metric: 'user.signup',
          periodType: SummaryPeriod.DAY,
          periodStart: testDate.toISOString(),
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.value).toBe(42);
        });
    });

    it('should return 0 when summary does not exist', () => {
      const testDate = new Date('2024-12-31T00:00:00Z');

      return request(app.getHttpServer())
        .get('/summaries')
        .set('x-api-key', apiKey)
        .query({
          metric: 'nonexistent.metric',
          periodType: SummaryPeriod.DAY,
          periodStart: testDate.toISOString(),
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.value).toBe(0);
        });
    });

    it('should return 401 when API key is missing', () => {
      return request(app.getHttpServer())
        .get('/summaries')
        .query({
          metric: 'user.signup',
          periodType: SummaryPeriod.DAY,
          periodStart: '2024-01-01T00:00:00Z',
        })
        .expect(401);
    });

    it('should return 400 when metric is missing', () => {
      return request(app.getHttpServer())
        .get('/summaries')
        .set('x-api-key', apiKey)
        .query({
          periodType: SummaryPeriod.DAY,
          periodStart: '2024-01-01T00:00:00Z',
        })
        .expect(400);
    });

    it('should return 400 when periodType is invalid', () => {
      return request(app.getHttpServer())
        .get('/summaries')
        .set('x-api-key', apiKey)
        .query({
          metric: 'user.signup',
          periodType: 'invalid-period',
          periodStart: '2024-01-01T00:00:00Z',
        })
        .expect(400);
    });

    it('should support all SummaryPeriod types', async () => {
      const summaryRepo = dataSource.getRepository(EventSummary);
      const testDate = new Date('2024-01-01T00:00:00Z');

      for (const periodType of [
        SummaryPeriod.DAY,
        SummaryPeriod.WEEK,
        SummaryPeriod.MONTH,
      ]) {
        const summary = summaryRepo.create({
          tenant: testTenant,
          metric: `test.${periodType}`,
          periodType,
          periodStart: testDate,
          value: 123,
        });
        await summaryRepo.save(summary);

        await request(app.getHttpServer())
          .get('/summaries')
          .set('x-api-key', apiKey)
          .query({
            metric: `test.${periodType}`,
            periodType,
            periodStart: testDate.toISOString(),
          })
          .expect(200)
          .expect((res) => {
            expect(res.body.value).toBe(123);
          });
      }
    });

    it('should isolate data per tenant', async () => {
      const summaryRepo = dataSource.getRepository(EventSummary);
      const tenantRepo = dataSource.getRepository(Tenant);
      const testDate = new Date('2024-04-01T00:00:00Z');

      const otherTenant = tenantRepo.create({
        name: 'Other Tenant',
        apiKey: 'other-key-' + Date.now(),
      });
      await tenantRepo.save(otherTenant);

      try {
        const summary = summaryRepo.create({
          tenant: otherTenant,
          metric: 'user.signup',
          periodType: SummaryPeriod.DAY,
          periodStart: testDate,
          value: 500,
        });
        await summaryRepo.save(summary);

        const response = await request(app.getHttpServer())
          .get('/summaries')
          .set('x-api-key', apiKey)
          .query({
            metric: 'user.signup',
            periodType: SummaryPeriod.DAY,
            periodStart: testDate.toISOString(),
          });

        expect(response.status).toBe(200);
        expect(response.body.value).toBe(0);
      } finally {
        await summaryRepo.delete({ tenantId: otherTenant.id });
        await tenantRepo.delete({ id: otherTenant.id });
      }
    });
  });
});
