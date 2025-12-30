import { Module } from '@nestjs/common';
import { AggregatesService } from './aggregates.service';
import { AggregatesController } from './aggregates.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from 'src/events/entities/event.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Event])],
  controllers: [AggregatesController],
  providers: [AggregatesService],
})
export class AggregatesModule {}
