import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TenantsModule } from './tenants/tenants.module';
import { EventsModule } from './events/events.module';
import { AggregatesModule } from './aggregates/aggregates.module';
import { JobsModule } from './jobs/jobs.module';

@Module({
  imports: [TenantsModule, EventsModule, AggregatesModule, JobsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
