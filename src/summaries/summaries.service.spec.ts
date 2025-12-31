import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SummariesService } from './summaries.service';
import { EventSummary } from './entities/event-summary.entity';
import { SummaryPeriod } from './types/summary-period.enum';

describe('SummariesService', () => {
  let service: SummariesService;
  let mockRepository: any;

  beforeEach(async () => {
    mockRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SummariesService,
        {
          provide: getRepositoryToken(EventSummary),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<SummariesService>(SummariesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSummary', () => {
    it('should return summary when found', async () => {
      const params = {
        tenantId: 'tenant-1',
        metric: 'user.signup',
        periodType: SummaryPeriod.DAY,
        periodStart: '2024-01-01T00:00:00Z',
      };

      const mockSummary = {
        id: 1,
        tenantId: 'tenant-1',
        metric: 'user.signup',
        periodType: SummaryPeriod.DAY,
        periodStart: new Date('2024-01-01T00:00:00Z'),
        value: 42,
        createdAt: new Date(),
      };

      mockRepository.findOne.mockResolvedValue(mockSummary);

      const result = await service.getSummary(params);

      expect(result.value).toBe(42);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-1',
          metric: 'user.signup',
          periodType: SummaryPeriod.DAY,
          periodStart: new Date('2024-01-01T00:00:00Z'),
        },
      });
    });

    it('should return 0 when summary not found', async () => {
      const params = {
        tenantId: 'tenant-1',
        metric: 'nonexistent.metric',
        periodType: SummaryPeriod.DAY,
        periodStart: '2024-01-01T00:00:00Z',
      };

      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.getSummary(params);

      expect(result.value).toBe(0);
    });

    it('should handle all period types', async () => {
      const periodTypes = [
        SummaryPeriod.DAY,
        SummaryPeriod.WEEK,
        SummaryPeriod.MONTH,
      ];

      for (const periodType of periodTypes) {
        const params = {
          tenantId: 'tenant-1',
          metric: 'test.metric',
          periodType,
          periodStart: '2024-01-01T00:00:00Z',
        };

        mockRepository.findOne.mockResolvedValue(null);
        const result = await service.getSummary(params);

        expect(result).toHaveProperty('value');
      }
    });
  });
});
