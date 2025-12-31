import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventSummary } from './entities/event-summary.entity';
import { Repository } from 'typeorm';
import { GetSummaryParams } from './types/get-summary.type';

@Injectable()
export class SummariesService {
  constructor(
    @InjectRepository(EventSummary)
    private readonly summariesRepo: Repository<EventSummary>,
  ) {}
  async getSummary(params: GetSummaryParams) {
    const summary = await this.summariesRepo.findOne({
      where: {
        tenantId: params.tenantId,
        metric: params.metric,
        periodType: params.periodType,
        periodStart: new Date(params.periodStart),
      },
    });
    if (!summary) return { value: 0 };
    return { value: summary.value };
  }
}
