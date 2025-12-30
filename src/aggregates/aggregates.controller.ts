import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { AggregatesService } from './aggregates.service';
import { ApiKeyGuard } from 'src/tenants/guards/apiKey.guard';
import type { Request } from 'express';
import { IntervalTimeLine } from './types/interval-time-line.enum';
import { AggregateFiltersDto } from './dto/aggregate-filters.dto';

@Controller('analytics/events')
@UseGuards(ApiKeyGuard)
export class AggregatesController {
  constructor(private readonly aggregatesService: AggregatesService) {}

  /**
   * Get total event count with optional filters
   * Query params: from (ISO date), to (ISO date), type (string)
   */
  @Get('count')
  async countEvents(@Req() req: Request, @Query() query: AggregateFiltersDto) {
    const tenantId = req.tenant!.id;
    return await this.aggregatesService.countEvents(tenantId, query);
  }

  /**
   * Get event counts grouped by type
   * Query params: from (ISO date), to (ISO date)
   */
  @Get('by-type')
  async countEventsByType(
    @Req() req: Request,
    @Query() query: AggregateFiltersDto,
  ) {
    const tenantId = req.tenant!.id;
    return await this.aggregatesService.countEventsByType(tenantId, query);
  }

  /**
   * Get event counts over time with configurable interval
   * Query params: from (ISO date), to (ISO date), type (string), interval (day|week|month)
   */
  @Get('timeline')
  async countEventsTimeline(
    @Req() req: Request,
    @Query() query: AggregateFiltersDto,
  ): Promise<{ date: string; total: number }[]> {
    const tenantId = req.tenant!.id;
    const interval = query.interval || IntervalTimeLine.day;
    return await this.aggregatesService.countEventsTimeLine(
      tenantId,
      query,
      interval,
    );
  }
}
