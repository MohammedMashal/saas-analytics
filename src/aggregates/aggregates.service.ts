import { BadRequestException, Injectable } from '@nestjs/common';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Event } from 'src/events/entities/event.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { IntervalTimeLine } from './types/interval-time-line.enum';
import { AggregateFiltersDto } from './dto/aggregate-filters.dto';

@Injectable()
export class AggregatesService {
  constructor(
    @InjectRepository(Event) private readonly eventsRepo: Repository<Event>,
  ) {}

  async countEvents(
    tenantId: string,
    filters: AggregateFiltersDto,
  ): Promise<{ total: number }> {
    const query = this.buildBaseQuery(tenantId, filters);

    const total = await query.getCount();
    return { total };
  }

  async countEventsByType(
    tenantId: string,
    filters: AggregateFiltersDto,
  ): Promise<{ type: string; total: number }[]> {
    const query = this.buildBaseQuery(tenantId, filters);
    query
      .select(['event.type AS type', 'COUNT(*) AS total'])
      .groupBy('event.type')
      .orderBy('total', 'DESC');
    return await query.getRawMany();
  }

  async countEventsTimeLine(
    tenantId: string,
    filters: AggregateFiltersDto,
    interval: IntervalTimeLine = IntervalTimeLine.day,
  ): Promise<{ date: string; total: number }[]> {
    // Validate interval enum to prevent SQL injection
    if (!Object.values(IntervalTimeLine).includes(interval)) {
      throw new BadRequestException('Invalid interval value');
    }

    const query = this.buildBaseQuery(tenantId, filters);
    query
      .select([
        `DATE_TRUNC('${interval}',event.occurredAt) AS date`,
        'COUNT(*) AS total',
      ])
      .groupBy('date')
      .orderBy('date', 'ASC');
    return await query.getRawMany();
  }

  /*
    shared methods
  */
  private buildBaseQuery(
    tenantId: string,
    filters: AggregateFiltersDto,
  ): SelectQueryBuilder<Event> {
    const query = this.eventsRepo.createQueryBuilder('event');

    // 1- Add tenantId filter
    query.where('event.tenantId = :tenantId', { tenantId });

    // 2- Add time range filters
    if (filters.from && filters.to) {
      const fromDate = new Date(filters.from);
      const toDate = new Date(filters.to);

      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        throw new BadRequestException('Invalid date format');
      }

      if (fromDate > toDate) {
        throw new BadRequestException('from date must be before to date');
      }

      query.andWhere('event.occurredAt BETWEEN :from AND :to', {
        from: fromDate,
        to: toDate,
      });
    }

    // 3- Add event type filter
    if (filters.type) {
      query.andWhere('event.type = :type', { type: filters.type });
    }

    // 4- Add JSONB data filters
    this.applyJsonbFilters(query, filters);

    return query;
  }

  private applyJsonbFilters(
    query: SelectQueryBuilder<Event>,
    filters: AggregateFiltersDto,
  ): void {
    let jsonFilterIndex = 0;

    Object.entries(filters).forEach(([key, value]) => {
      if (!key.startsWith('data.')) return;

      // Skip if value is undefined or null
      if (value === undefined || value === null) return;

      const jsonKey = key.replace('data.', '');

      // Validate jsonKey to prevent injection
      if (!/^[a-zA-Z0-9_]+$/.test(jsonKey)) {
        throw new BadRequestException(`Invalid JSONB key format: ${jsonKey}`);
      }

      const paramKey = `json_${jsonFilterIndex++}`;
      const valueStr = String(value).trim();

      // Check for comparison operators
      const match = valueStr.match(/^(>=|<=|<|>)\s*(.+)$/);

      if (match && match.length >= 3) {
        const op = match[1];
        const numVal = Number(match[2]);

        if (isNaN(numVal)) {
          // If not a valid number, treat as string comparison
          query.andWhere(`event.data ->> :${paramKey}_key = :${paramKey}`, {
            [`${paramKey}_key`]: jsonKey,
            [paramKey]: valueStr,
          });
        } else {
          // Numeric comparison with validated operator
          const allowedOps = ['>=', '<=', '<', '>'];
          if (!allowedOps.includes(op)) {
            throw new BadRequestException(`Invalid operator: ${op}`);
          }

          query.andWhere(
            `(event.data ->> :${paramKey}_key)::numeric ${op} :${paramKey}`,
            {
              [`${paramKey}_key`]: jsonKey,
              [paramKey]: numVal,
            },
          );
        }
      } else {
        // Exact match
        query.andWhere(`event.data ->> :${paramKey}_key = :${paramKey}`, {
          [`${paramKey}_key`]: jsonKey,
          [paramKey]: valueStr,
        });
      }
    });
  }
}
