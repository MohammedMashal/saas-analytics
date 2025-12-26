/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-single-event.dto';
import { BulkCreateEventDto } from './dto/create-bulk-event.dto';

describe('EventsService', () => {
  let service: EventsService;
  let mockRepo: { create: jest.Mock; save: jest.Mock };

  beforeEach(() => {
    mockRepo = { create: jest.fn(), save: jest.fn() };
    service = new EventsService(mockRepo as any);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createOne', () => {
    it('creates and saves an event with the tenant id', async () => {
      const tenantId = 'tenant-123';
      const dto: CreateEventDto = {
        type: 'page_view',
        occurredAt: new Date(),
        data: { url: '/home' },
      };

      const created = { ...dto, tenant: { id: tenantId } };
      const saved = { id: 1, ...created };

      mockRepo.create.mockReturnValue(created);
      mockRepo.save.mockResolvedValue(saved);

      const result = await service.createOne(tenantId, dto);

      expect(mockRepo.create).toHaveBeenCalledWith({
        ...dto,
        tenant: { id: tenantId },
      });
      expect(mockRepo.save).toHaveBeenCalledWith(created);
      expect(result).toEqual(saved);
    });
  });

  describe('createBulk', () => {
    it('saves all events with the tenant id', async () => {
      const tenantId = 'tenant-123';
      const event1 = {
        type: 'page_view',
        occurredAt: new Date(),
        data: { url: '/home' },
      };
      const event2 = {
        type: 'click',
        occurredAt: new Date(),
        data: { button: 'signup' },
      };
      const dto: BulkCreateEventDto = { events: [event1, event2] };

      const expectedEvents = dto.events.map((e) => ({
        ...e,
        tenant: { id: tenantId },
      }));
      const saved = [
        { id: 1, ...expectedEvents[0] },
        { id: 2, ...expectedEvents[1] },
      ];

      mockRepo.save.mockResolvedValue(saved);

      const result = await service.createBulk(tenantId, dto);

      expect(mockRepo.save).toHaveBeenCalledWith(expectedEvents);
      expect(result).toEqual(saved);
    });
  });
});
