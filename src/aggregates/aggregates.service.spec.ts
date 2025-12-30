import { Test, TestingModule } from '@nestjs/testing';
import { AggregatesService } from './aggregates.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Event } from 'src/events/entities/event.entity';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { IntervalTimeLine } from './types/interval-time-line.enum';
import { AggregateFiltersDto } from './dto/aggregate-filters.dto';

describe('AggregatesService', () => {
  let service: AggregatesService;
  let repository: Repository<Event>;
  let queryBuilder: SelectQueryBuilder<Event>;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getCount: jest.fn(),
    getRawMany: jest.fn(),
  };

  const mockRepository = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AggregatesService,
        {
          provide: getRepositoryToken(Event),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<AggregatesService>(AggregatesService);
    repository = module.get<Repository<Event>>(getRepositoryToken(Event));
    queryBuilder = mockQueryBuilder as any;

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('countEvents', () => {
    it('should return total count of events', async () => {
      const tenantId = 'tenant-123';
      const filters: AggregateFiltersDto = {};
      const expectedCount = 42;

      mockQueryBuilder.getCount.mockResolvedValue(expectedCount);

      const result = await service.countEvents(tenantId, filters);

      expect(result).toEqual({ total: expectedCount });
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('event');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'event.tenantId = :tenantId',
        { tenantId },
      );
      expect(mockQueryBuilder.getCount).toHaveBeenCalled();
    });

    it('should apply filters correctly', async () => {
      const tenantId = 'tenant-123';
      const filters: AggregateFiltersDto = {
        from: '2025-01-01T00:00:00Z',
        to: '2025-12-31T23:59:59Z',
        type: 'user.signup',
      };

      mockQueryBuilder.getCount.mockResolvedValue(10);

      await service.countEvents(tenantId, filters);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'event.occurredAt BETWEEN :from AND :to',
        expect.objectContaining({
          from: expect.any(Date),
          to: expect.any(Date),
        }),
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'event.type = :type',
        { type: 'user.signup' },
      );
    });

    it('should throw BadRequestException for invalid date format', async () => {
      const tenantId = 'tenant-123';
      const filters: AggregateFiltersDto = {
        from: 'invalid-date',
        to: '2025-12-31T23:59:59Z',
      };

      await expect(service.countEvents(tenantId, filters)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.countEvents(tenantId, filters)).rejects.toThrow(
        'Invalid date format',
      );
    });

    it('should throw BadRequestException when from date is after to date', async () => {
      const tenantId = 'tenant-123';
      const filters: AggregateFiltersDto = {
        from: '2025-12-31T23:59:59Z',
        to: '2025-01-01T00:00:00Z',
      };

      await expect(service.countEvents(tenantId, filters)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.countEvents(tenantId, filters)).rejects.toThrow(
        'from date must be before to date',
      );
    });
  });

  describe('countEventsByType', () => {
    it('should return event counts grouped by type', async () => {
      const tenantId = 'tenant-123';
      const filters: AggregateFiltersDto = {};
      const expectedResult = [
        { type: 'user.signup', total: 100 },
        { type: 'user.login', total: 500 },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValue(expectedResult);

      const result = await service.countEventsByType(tenantId, filters);

      expect(result).toEqual(expectedResult);
      expect(mockQueryBuilder.select).toHaveBeenCalledWith([
        'event.type AS type',
        'COUNT(*) AS total',
      ]);
      expect(mockQueryBuilder.groupBy).toHaveBeenCalledWith('event.type');
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('total', 'DESC');
    });

    it('should apply filters when provided', async () => {
      const tenantId = 'tenant-123';
      const filters: AggregateFiltersDto = {
        from: '2025-01-01T00:00:00Z',
        to: '2025-12-31T23:59:59Z',
      };

      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      await service.countEventsByType(tenantId, filters);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });
  });

  describe('countEventsTimeLine', () => {
    it('should return event counts over time with default interval', async () => {
      const tenantId = 'tenant-123';
      const filters: AggregateFiltersDto = {};
      const expectedResult = [
        { date: '2025-01-01', total: 10 },
        { date: '2025-01-02', total: 15 },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValue(expectedResult);

      const result = await service.countEventsTimeLine(tenantId, filters);

      expect(result).toEqual(expectedResult);
      expect(mockQueryBuilder.select).toHaveBeenCalledWith([
        "DATE_TRUNC('day',event.occurredAt) AS date",
        'COUNT(*) AS total',
      ]);
      expect(mockQueryBuilder.groupBy).toHaveBeenCalledWith('date');
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('date', 'ASC');
    });

    it('should use custom interval when provided', async () => {
      const tenantId = 'tenant-123';
      const filters: AggregateFiltersDto = {};
      const interval = IntervalTimeLine.month;

      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      await service.countEventsTimeLine(tenantId, filters, interval);

      expect(mockQueryBuilder.select).toHaveBeenCalledWith([
        "DATE_TRUNC('month',event.occurredAt) AS date",
        'COUNT(*) AS total',
      ]);
    });

    it('should throw BadRequestException for invalid interval', async () => {
      const tenantId = 'tenant-123';
      const filters: AggregateFiltersDto = {};
      const invalidInterval = 'invalid' as IntervalTimeLine;

      await expect(
        service.countEventsTimeLine(tenantId, filters, invalidInterval),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.countEventsTimeLine(tenantId, filters, invalidInterval),
      ).rejects.toThrow('Invalid interval value');
    });
  });

  describe('JSONB filters', () => {
    it('should apply JSONB exact match filter', async () => {
      const tenantId = 'tenant-123';
      const filters: AggregateFiltersDto = {
        'data.userId': '12345',
      };

      mockQueryBuilder.getCount.mockResolvedValue(5);

      await service.countEvents(tenantId, filters);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'event.data ->> :json_0_key = :json_0',
        {
          json_0_key: 'userId',
          json_0: '12345',
        },
      );
    });

    it('should apply JSONB numeric comparison filter (greater than)', async () => {
      const tenantId = 'tenant-123';
      const filters: AggregateFiltersDto = {
        'data.price': '>100',
      };

      mockQueryBuilder.getCount.mockResolvedValue(5);

      await service.countEvents(tenantId, filters);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(event.data ->> :json_0_key)::numeric > :json_0',
        {
          json_0_key: 'price',
          json_0: 100,
        },
      );
    });

    it('should apply JSONB numeric comparison filter (less than or equal)', async () => {
      const tenantId = 'tenant-123';
      const filters: AggregateFiltersDto = {
        'data.quantity': '<=50',
      };

      mockQueryBuilder.getCount.mockResolvedValue(3);

      await service.countEvents(tenantId, filters);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(event.data ->> :json_0_key)::numeric <= :json_0',
        {
          json_0_key: 'quantity',
          json_0: 50,
        },
      );
    });

    it('should throw BadRequestException for invalid JSONB key format', async () => {
      const tenantId = 'tenant-123';
      const filters: AggregateFiltersDto = {
        'data.invalid-key!': 'value',
      };

      await expect(service.countEvents(tenantId, filters)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.countEvents(tenantId, filters)).rejects.toThrow(
        'Invalid JSONB key format',
      );
    });

    it('should throw BadRequestException for invalid operator', async () => {
      const tenantId = 'tenant-123';
      const filters: AggregateFiltersDto = {
        'data.value': '==100',
      };

      mockQueryBuilder.getCount.mockResolvedValue(0);

      await expect(service.countEvents(tenantId, filters)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.countEvents(tenantId, filters)).rejects.toThrow(
        'Invalid operator',
      );
    });

    it('should skip null and undefined JSONB filter values', async () => {
      const tenantId = 'tenant-123';
      const filters: AggregateFiltersDto = {
        'data.field1': null,
        'data.field2': undefined,
      };

      mockQueryBuilder.getCount.mockResolvedValue(0);

      await service.countEvents(tenantId, filters);

      // andWhere should only be called for tenantId, not for the null/undefined values
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith(
        expect.stringContaining('data'),
        expect.any(Object),
      );
    });

    it('should handle multiple JSONB filters', async () => {
      const tenantId = 'tenant-123';
      const filters: AggregateFiltersDto = {
        'data.userId': '123',
        'data.price': '>100',
        'data.status': 'active',
      };

      mockQueryBuilder.getCount.mockResolvedValue(2);

      await service.countEvents(tenantId, filters);

      // Should call andWhere for each JSONB filter
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(3);
    });
  });
});
