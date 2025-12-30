import { IsOptional, IsString, IsDateString, IsEnum } from 'class-validator';
import { IntervalTimeLine } from '../types/interval-time-line.enum';

export class AggregateFiltersDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsEnum(IntervalTimeLine)
  interval?: IntervalTimeLine;

  // Allow dynamic JSONB filters with data. prefix
  [key: string]: any;
}
