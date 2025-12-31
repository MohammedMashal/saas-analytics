import { SummaryPeriod } from './summary-period.enum';

export interface GetSummaryParams {
  tenantId: string;
  metric: string;
  periodType: SummaryPeriod;
  periodStart: string;
}
