import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-single-event.dto';
import { ApiKeyGuard } from 'src/tenants/guards/apiKey.guard';
import type { Request } from 'express';
import { BulkCreateEventDto } from './dto/create-bulk-event.dto';
import { Event } from './entities/event.entity';

@Controller('events')
@UseGuards(ApiKeyGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  async create(
    @Req() req: Request,
    @Body() dto: CreateEventDto,
  ): Promise<Event> {
    return await this.eventsService.createOne(req.tenant!.id, dto);
  }

  @Post('bulk')
  async bulkCreate(
    @Req() req: Request,
    @Body() dto: BulkCreateEventDto,
  ): Promise<Event[]> {
    return await this.eventsService.createBulk(req.tenant!.id, dto);
  }
}
