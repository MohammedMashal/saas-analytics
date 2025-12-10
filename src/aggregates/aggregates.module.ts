import { Module } from '@nestjs/common';
import { AggregatesService } from './aggregates.service';
import { AggregatesController } from './aggregates.controller';

@Module({
  controllers: [AggregatesController],
  providers: [AggregatesService],
})
export class AggregatesModule {}
