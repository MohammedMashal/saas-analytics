import { Test, TestingModule } from '@nestjs/testing';
import { SummariesController } from './summaries.controller';
import { SummariesService } from './summaries.service';
import { SummaryPeriod } from './types/summary-period.enum';
import { CanActivate } from '@nestjs/common';
import { ApiKeyGuard } from 'src/tenants/guards/apiKey.guard';

describe('SummariesController', () => {
  let controller: SummariesController;
  let service: SummariesService;

  const mockRequest = {
    tenant: {
      id: 'tenant-123',
    },
  };

  const mockApiKeyGuard: CanActivate = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SummariesController],
      providers: [
        {
          provide: SummariesService,
          useValue: {
            getSummary: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(ApiKeyGuard)
      .useValue(mockApiKeyGuard)
      .compile();

    controller = module.get<SummariesController>(SummariesController);
    service = module.get<SummariesService>(SummariesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSummary', () => {
    it('should return summary from service', async () => {
      const mockResponse = {
        value: 42,
        metric: 'user.signup',
      };

      jest.spyOn(service, 'getSummary').mockResolvedValue(mockResponse);

      const result = await controller.getSummary(
        mockRequest as any,
        'user.signup',
        SummaryPeriod.DAY,
        '2024-01-01T00:00:00Z',
      );

      expect(result.value).toBe(42);
      expect(service.getSummary).toHaveBeenCalledWith({
        tenantId: 'tenant-123',
        metric: 'user.signup',
        periodType: SummaryPeriod.DAY,
        periodStart: '2024-01-01T00:00:00Z',
      });
    });

    it('should pass tenantId from request', async () => {
      jest.spyOn(service, 'getSummary').mockResolvedValue({ value: 0 });

      const customRequest = { tenant: { id: 'custom-tenant' } };

      await controller.getSummary(
        customRequest as any,
        'metric',
        SummaryPeriod.WEEK,
        '2024-01-01T00:00:00Z',
      );

      expect(service.getSummary).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 'custom-tenant' }),
      );
    });

    it('should work with all period types', async () => {
      jest.spyOn(service, 'getSummary').mockResolvedValue({ value: 0 });

      const periodTypes = [
        SummaryPeriod.DAY,
        SummaryPeriod.WEEK,
        SummaryPeriod.MONTH,
      ];

      for (const periodType of periodTypes) {
        await controller.getSummary(
          mockRequest as any,
          'metric',
          periodType,
          '2024-01-01T00:00:00Z',
        );

        expect(service.getSummary).toHaveBeenCalledWith(
          expect.objectContaining({ periodType }),
        );
      }
    });
  });
});
