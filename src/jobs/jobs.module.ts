import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventSummary } from 'src/summaries/entities/event-summary.entity';
import { Event } from 'src/events/entities/event.entity';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  providers: [JobsService],
  imports: [
    TypeOrmModule.forFeature([EventSummary, Event]),
    ScheduleModule.forRoot(),
  ],
})
export class JobsModule {}
