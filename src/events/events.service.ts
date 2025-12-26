import { Injectable } from '@nestjs/common';
import { CreateEventDto } from './dto/create-single-event.dto';
import { BulkCreateEventDto } from './dto/create-bulk-event.dto';
import { Repository } from 'typeorm';
import { Event } from './entities/event.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event) private readonly eventsRepo: Repository<Event>,
  ) {}

  async createOne(tenantId: string, dto: CreateEventDto) {
    const event = this.eventsRepo.create({
      ...dto,
      tenant: { id: tenantId },
    });
    return await this.eventsRepo.save(event);
  }

  async createBulk(tenantId: string, dto: BulkCreateEventDto) {
    const events = dto.events.map((e) => ({
      ...e,
      tenant: { id: tenantId },
    }));
    return await this.eventsRepo.save(events);
  }
}
