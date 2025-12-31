import { Tenant } from 'src/tenants/entities/tenant.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';
import { SummaryPeriod } from '../types/summary-period.enum';

@Entity('event_summaries')
@Index(['tenant', 'periodType', 'periodStart', 'metric'], { unique: true })
export class EventSummary {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @RelationId((eventSummary: EventSummary) => eventSummary.tenant)
  tenantId: string;

  @Column({
    type: 'enum',
    enum: SummaryPeriod,
  })
  periodType: SummaryPeriod;

  @Column()
  periodStart: Date;

  @Column()
  metric: string;

  @Column({ type: 'bigint' })
  value: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
