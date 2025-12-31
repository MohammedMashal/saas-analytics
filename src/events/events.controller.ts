import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-single-event.dto';
import { ApiKeyGuard } from 'src/tenants/guards/apiKey.guard';
import { ApiKeyThrottleGuard } from 'src/tenants/guards/throttle.guard';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { BulkCreateEventDto } from './dto/create-bulk-event.dto';
import { Event } from './entities/event.entity';

@Controller('events')
@UseGuards(ApiKeyGuard, ApiKeyThrottleGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @Throttle({ default: { limit: 1000, ttl: 60000 } })
  async create(
    @Req() req: Request,
    @Body() dto: CreateEventDto,
  ): Promise<Event> {
    return await this.eventsService.createOne(req.tenant!.id, dto);
  }

  @Post('bulk')
  @Throttle({ default: { limit: 1000, ttl: 60000 } })
  async bulkCreate(
    @Req() req: Request,
    @Body() dto: BulkCreateEventDto,
  ): Promise<Event[]> {
    return await this.eventsService.createBulk(req.tenant!.id, dto);
  }
}
