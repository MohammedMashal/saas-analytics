import { Test, TestingModule } from '@nestjs/testing';
import { AggregatesController } from './aggregates.controller';
import { AggregatesService } from './aggregates.service';
import { IntervalTimeLine } from './types/interval-time-line.enum';
import { AggregateFiltersDto } from './dto/aggregate-filters.dto';

describe('AggregatesController', () => {
  let controller: AggregatesController;
  let service: AggregatesService;

  const mockAggregatesService = {
    countEvents: jest.fn(),
    countEventsByType: jest.fn(),
    countEventsTimeLine: jest.fn(),
  };

  const mockRequest = {
    tenant: {
      id: 'tenant-123',
      name: 'Test Tenant',
      apiKey: 'test-api-key',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AggregatesController],
      providers: [
        {
          provide: AggregatesService,
          useValue: mockAggregatesService,
        },
      ],
    }).compile();

    controller = module.get<AggregatesController>(AggregatesController);
    service = module.get<AggregatesService>(AggregatesService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('countEvents', () => {
    it('should return total event count', async () => {
      const query: AggregateFiltersDto = {};
      const expectedResult = { total: 42 };

      mockAggregatesService.countEvents.mockResolvedValue(expectedResult);

      const result = await controller.countEvents(mockRequest as any, query);

      expect(result).toEqual(expectedResult);
      expect(service.countEvents).toHaveBeenCalledWith('tenant-123', query);
      expect(service.countEvents).toHaveBeenCalledTimes(1);
    });

    it('should pass filters to service', async () => {
      const query: AggregateFiltersDto = {
        from: '2025-01-01T00:00:00Z',
        to: '2025-12-31T23:59:59Z',
        type: 'user.signup',
      };
      const expectedResult = { total: 10 };

      mockAggregatesService.countEvents.mockResolvedValue(expectedResult);

      await controller.countEvents(mockRequest as any, query);

      expect(service.countEvents).toHaveBeenCalledWith('tenant-123', query);
    });

    it('should extract tenantId from request', async () => {
      const query: AggregateFiltersDto = {};
      mockAggregatesService.countEvents.mockResolvedValue({ total: 0 });

      await controller.countEvents(mockRequest as any, query);

      expect(service.countEvents).toHaveBeenCalledWith(
        'tenant-123',
        expect.any(Object),
      );
    });
  });

  describe('countEventsByType', () => {
    it('should return event counts grouped by type', async () => {
      const query: AggregateFiltersDto = {};
      const expectedResult = [
        { type: 'user.signup', total: 100 },
        { type: 'user.login', total: 500 },
        { type: 'purchase.completed', total: 50 },
      ];

      mockAggregatesService.countEventsByType.mockResolvedValue(expectedResult);

      const result = await controller.countEventsByType(
        mockRequest as any,
        query,
      );

      expect(result).toEqual(expectedResult);
      expect(service.countEventsByType).toHaveBeenCalledWith(
        'tenant-123',
        query,
      );
      expect(service.countEventsByType).toHaveBeenCalledTimes(1);
    });

    it('should pass date range filters to service', async () => {
      const query: AggregateFiltersDto = {
        from: '2025-01-01T00:00:00Z',
        to: '2025-01-31T23:59:59Z',
      };

      mockAggregatesService.countEventsByType.mockResolvedValue([]);

      await controller.countEventsByType(mockRequest as any, query);

      expect(service.countEventsByType).toHaveBeenCalledWith(
        'tenant-123',
        query,
      );
    });

    it('should handle empty results', async () => {
      const query: AggregateFiltersDto = {};
      mockAggregatesService.countEventsByType.mockResolvedValue([]);

      const result = await controller.countEventsByType(
        mockRequest as any,
        query,
      );

      expect(result).toEqual([]);
    });
  });

  describe('countEventsTimeline', () => {
    it('should return timeline with default interval (day)', async () => {
      const query: AggregateFiltersDto = {};
      const expectedResult = [
        { date: '2025-01-01', total: 10 },
        { date: '2025-01-02', total: 15 },
      ];

      mockAggregatesService.countEventsTimeLine.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.countEventsTimeline(
        mockRequest as any,
        query,
      );

      expect(result).toEqual(expectedResult);
      expect(service.countEventsTimeLine).toHaveBeenCalledWith(
        'tenant-123',
        query,
        IntervalTimeLine.day,
      );
    });

    it('should use custom interval when provided', async () => {
      const query: AggregateFiltersDto = {
        interval: IntervalTimeLine.month,
      };
      const expectedResult = [
        { date: '2025-01-01', total: 100 },
        { date: '2025-02-01', total: 150 },
      ];

      mockAggregatesService.countEventsTimeLine.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.countEventsTimeline(
        mockRequest as any,
        query,
      );

      expect(result).toEqual(expectedResult);
      expect(service.countEventsTimeLine).toHaveBeenCalledWith(
        'tenant-123',
        query,
        IntervalTimeLine.month,
      );
    });

    it('should handle week interval', async () => {
      const query: AggregateFiltersDto = {
        interval: IntervalTimeLine.week,
      };

      mockAggregatesService.countEventsTimeLine.mockResolvedValue([]);

      await controller.countEventsTimeline(mockRequest as any, query);

      expect(service.countEventsTimeLine).toHaveBeenCalledWith(
        'tenant-123',
        query,
        IntervalTimeLine.week,
      );
    });

    it('should pass all filters including type to service', async () => {
      const query: AggregateFiltersDto = {
        from: '2025-01-01T00:00:00Z',
        to: '2025-12-31T23:59:59Z',
        type: 'user.login',
        interval: IntervalTimeLine.day,
      };

      mockAggregatesService.countEventsTimeLine.mockResolvedValue([]);

      await controller.countEventsTimeline(mockRequest as any, query);

      expect(service.countEventsTimeLine).toHaveBeenCalledWith(
        'tenant-123',
        query,
        IntervalTimeLine.day,
      );
    });

    it('should extract tenantId from request', async () => {
      const query: AggregateFiltersDto = {};
      mockAggregatesService.countEventsTimeLine.mockResolvedValue([]);

      await controller.countEventsTimeline(mockRequest as any, query);

      expect(service.countEventsTimeLine).toHaveBeenCalledWith(
        'tenant-123',
        expect.any(Object),
        expect.any(String),
      );
    });
  });
});
