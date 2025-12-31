import { Test, TestingModule } from '@nestjs/testing';
import { JobsService } from './jobs.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Event } from 'src/events/entities/event.entity';
import { EventSummary } from 'src/summaries/entities/event-summary.entity';
import { Repository } from 'typeorm';
import { SummaryPeriod } from 'src/summaries/types/summary-period.enum';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
  subWeeks,
  subMonths,
} from 'date-fns';

describe('JobsService', () => {
  let service: JobsService;
  let eventsRepo: Repository<Event>;
  let summariesRepo: Repository<EventSummary>;

  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
  };

  const mockEventsRepository = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  const mockSummariesRepository = {
    upsert: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        {
          provide: getRepositoryToken(Event),
          useValue: mockEventsRepository,
        },
        {
          provide: getRepositoryToken(EventSummary),
          useValue: mockSummariesRepository,
        },
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
    eventsRepo = module.get<Repository<Event>>(getRepositoryToken(Event));
    summariesRepo = module.get<Repository<EventSummary>>(
      getRepositoryToken(EventSummary),
    );

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateDailySummaries', () => {
    it('should calculate summaries for yesterday', async () => {
      const mockAggregates = [
        { tenantId: 'tenant1', type: 'pageview', count: '10' },
        { tenantId: 'tenant1', type: 'click', count: '5' },
        { tenantId: 'tenant2', type: 'pageview', count: '20' },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValue(mockAggregates);

      await service.calculateDailySummaries();

      const yesterday = subDays(new Date(), 1);
      const expectedStart = startOfDay(yesterday);
      const expectedEnd = endOfDay(yesterday);

      expect(mockEventsRepository.createQueryBuilder).toHaveBeenCalledWith(
        'event',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'event.occurredAt BETWEEN :start AND :end',
        { start: expectedStart, end: expectedEnd },
      );
      expect(mockSummariesRepository.upsert).toHaveBeenCalledWith(
        [
          {
            tenant: { id: 'tenant1' },
            tenantId: 'tenant1',
            metric: 'pageview',
            periodType: SummaryPeriod.DAY,
            periodStart: expectedStart,
            value: 10,
          },
          {
            tenant: { id: 'tenant1' },
            tenantId: 'tenant1',
            metric: 'click',
            periodType: SummaryPeriod.DAY,
            periodStart: expectedStart,
            value: 5,
          },
          {
            tenant: { id: 'tenant2' },
            tenantId: 'tenant2',
            metric: 'pageview',
            periodType: SummaryPeriod.DAY,
            periodStart: expectedStart,
            value: 20,
          },
        ],
        {
          conflictPaths: ['tenantId', 'periodType', 'periodStart', 'metric'],
          skipUpdateIfNoValuesChanged: true,
        },
      );
    });

    it('should not call upsert when no aggregates found', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      await service.calculateDailySummaries();

      expect(mockSummariesRepository.upsert).not.toHaveBeenCalled();
    });

    it('should log error and rethrow on failure', async () => {
      const error = new Error('Database error');
      mockQueryBuilder.getRawMany.mockRejectedValue(error);

      await expect(service.calculateDailySummaries()).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('calculateWeeklySummaries', () => {
    it('should calculate summaries for last week', async () => {
      const mockAggregates = [
        { tenantId: 'tenant1', type: 'signup', count: '15' },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValue(mockAggregates);

      await service.calculateWeeklySummaries();

      const lastWeek = subWeeks(new Date(), 1);
      const expectedStart = startOfWeek(lastWeek, { weekStartsOn: 5 });
      const expectedEnd = endOfWeek(lastWeek, { weekStartsOn: 5 });

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'event.occurredAt BETWEEN :start AND :end',
        { start: expectedStart, end: expectedEnd },
      );
      expect(mockSummariesRepository.upsert).toHaveBeenCalledWith(
        [
          {
            tenant: { id: 'tenant1' },
            tenantId: 'tenant1',
            metric: 'signup',
            periodType: SummaryPeriod.WEEK,
            periodStart: expectedStart,
            value: 15,
          },
        ],
        {
          conflictPaths: ['tenantId', 'periodType', 'periodStart', 'metric'],
          skipUpdateIfNoValuesChanged: true,
        },
      );
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Query failed');
      mockQueryBuilder.getRawMany.mockRejectedValue(error);

      await expect(service.calculateWeeklySummaries()).rejects.toThrow(
        'Query failed',
      );
    });
  });

  describe('calculateMonthlySummaries', () => {
    it('should calculate summaries for last month', async () => {
      const mockAggregates = [
        { tenantId: 'tenant3', type: 'conversion', count: '100' },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValue(mockAggregates);

      await service.calculateMonthlySummaries();

      const lastMonth = subMonths(new Date(), 1);
      const expectedStart = startOfMonth(lastMonth);
      const expectedEnd = endOfMonth(lastMonth);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'event.occurredAt BETWEEN :start AND :end',
        { start: expectedStart, end: expectedEnd },
      );
      expect(mockSummariesRepository.upsert).toHaveBeenCalledWith(
        [
          {
            tenant: { id: 'tenant3' },
            tenantId: 'tenant3',
            metric: 'conversion',
            periodType: SummaryPeriod.MONTH,
            periodStart: expectedStart,
            value: 100,
          },
        ],
        {
          conflictPaths: ['tenantId', 'periodType', 'periodStart', 'metric'],
          skipUpdateIfNoValuesChanged: true,
        },
      );
    });

    it('should handle empty results', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      await service.calculateMonthlySummaries();

      expect(mockSummariesRepository.upsert).not.toHaveBeenCalled();
    });
  });
});
