import {
  Controller,
  Get,
  ParseEnumPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SummariesService } from './summaries.service';
import { ApiKeyGuard } from 'src/tenants/guards/apiKey.guard';
import type { Request } from 'express';
import { SummaryPeriod } from './types/summary-period.enum';

@Controller('summaries')
@UseGuards(ApiKeyGuard)
export class SummariesController {
  constructor(private readonly summariesService: SummariesService) {}

  @Get()
  async getSummary(
    @Req() req: Request,
    @Query('metric') metric: string,
    @Query('periodType', new ParseEnumPipe(SummaryPeriod))
    periodType: SummaryPeriod,
    @Query('periodStart') periodStart: string,
  ) {
    const tenantId = req.tenant!.id;
    return await this.summariesService.getSummary({
      tenantId,
      metric,
      periodType,
      periodStart,
    });
  }
}
