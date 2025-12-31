/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Event } from 'src/events/entities/event.entity';
import { EventSummary } from 'src/summaries/entities/event-summary.entity';
import { Repository } from 'typeorm';
import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from 'date-fns';
import { SummaryPeriod } from 'src/summaries/types/summary-period.enum';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectRepository(EventSummary)
    private readonly summariesRepo: Repository<EventSummary>,
    @InjectRepository(Event)
    private readonly eventsRepo: Repository<Event>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async calculateDailySummaries(): Promise<void> {
    try {
      const yesterday = subDays(new Date(), 1);
      const start: Date = startOfDay(yesterday);
      const end: Date = endOfDay(yesterday);
      await this.aggregateAndSaveSummary(start, end, SummaryPeriod.DAY);
      this.logger.log('Daily summaries calculated successfully');
    } catch (error) {
      this.logger.error('Failed to calculate daily summaries', error);
      throw error;
    }
  }

  @Cron('0 1 * * 5') // At 1 AM every Friday
  async calculateWeeklySummaries(): Promise<void> {
    try {
      const lastWeek = subWeeks(new Date(), 1);
      const start: Date = startOfWeek(lastWeek, { weekStartsOn: 5 });
      const end: Date = endOfWeek(lastWeek, { weekStartsOn: 5 });
      await this.aggregateAndSaveSummary(start, end, SummaryPeriod.WEEK);
      this.logger.log('Weekly summaries calculated successfully');
    } catch (error) {
      this.logger.error('Failed to calculate weekly summaries', error);
      throw error;
    }
  }

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async calculateMonthlySummaries(): Promise<void> {
    try {
      const lastMonth = subMonths(new Date(), 1);
      const start: Date = startOfMonth(lastMonth);
      const end: Date = endOfMonth(lastMonth);
      await this.aggregateAndSaveSummary(start, end, SummaryPeriod.MONTH);
      this.logger.log('Monthly summaries calculated successfully');
    } catch (error) {
      this.logger.error('Failed to calculate monthly summaries', error);
      throw error;
    }
  }

  private async aggregateAndSaveSummary(
    start: Date,
    end: Date,
    periodType: SummaryPeriod,
  ): Promise<void> {
    const aggregates = await this.eventsRepo
      .createQueryBuilder('event')
      .select('event.tenantId', 'tenantId')
      .addSelect('event.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('event.occurredAt BETWEEN :start AND :end', { start, end })
      .groupBy('event.tenantId')
      .addGroupBy('event.type')
      .getRawMany<{ tenantId: string; type: string; count: string }>();

    if (aggregates.length > 0) {
      await this.summariesRepo.upsert(
        aggregates.map((aggregate) => ({
          tenant: { id: aggregate.tenantId },
          tenantId: aggregate.tenantId,
          metric: aggregate.type,
          periodType,
          periodStart: start,
          value: parseInt(aggregate.count, 10),
        })),
        {
          conflictPaths: ['tenantId', 'periodType', 'periodStart', 'metric'],
          skipUpdateIfNoValuesChanged: true,
        },
      );
    }
  }
}
