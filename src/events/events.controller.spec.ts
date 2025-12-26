/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-single-event.dto';
import { BulkCreateEventDto } from './dto/create-bulk-event.dto';
import { Request } from 'express';
import { ApiKeyGuard } from 'src/tenants/guards/apiKey.guard';

describe('EventsController', () => {
  let controller: EventsController;
  let eventsService: jest.Mocked<EventsService>;

  beforeEach(async () => {
    const moduleBuilder = Test.createTestingModule({
      controllers: [EventsController],
      providers: [
        {
          provide: EventsService,
          useValue: {
            createOne: jest.fn(),
            createBulk: jest.fn(),
          },
        },
      ],
    });

    const module: TestingModule = await moduleBuilder
      .overrideGuard(ApiKeyGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<EventsController>(EventsController);
    eventsService = module.get(EventsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a single event for the tenant', async () => {
      const dto: CreateEventDto = {
        type: 'page_view',
        occurredAt: new Date(),
        data: { url: '/home' },
      };

      const req = {
        tenant: { id: 'tenant-123', name: 'Test Tenant' },
      } as unknown as Request;

      eventsService.createOne.mockResolvedValue({ id: 1 } as any);

      const result = await controller.create(req, dto);

      expect(eventsService.createOne).toHaveBeenCalledWith('tenant-123', dto);
      expect(result).toEqual({ id: 1 });
    });
  });

  describe('bulkCreate', () => {
    it('should create multiple events for the tenant', async () => {
      const dto: BulkCreateEventDto = {
        events: [
          {
            type: 'page_view',
            occurredAt: new Date(),
            data: { url: '/home' },
          },
          {
            type: 'click',
            occurredAt: new Date(),
            data: { button: 'signup' },
          },
        ],
      };

      const req = {
        tenant: { id: 'tenant-123', name: 'Test Tenant' },
      } as unknown as Request;

      eventsService.createBulk.mockResolvedValue([{ id: 1 }, { id: 2 }] as any);

      const result = await controller.bulkCreate(req, dto);

      expect(eventsService.createBulk).toHaveBeenCalledWith('tenant-123', dto);
      expect(result).toEqual([{ id: 1 }, { id: 2 }]);
    });
  });
});
