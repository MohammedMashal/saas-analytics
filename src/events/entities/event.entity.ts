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

@Entity('events')
@Index(['tenantId'])
@Index(['tenantId', 'occurredAt'])
@Index(['tenantId', 'type'])
@Index(['tenantId', 'type', 'occurredAt'])
// GIN index on data column created via migration
export class Event {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @RelationId((event: Event) => event.tenant)
  tenantId: string;

  @Column()
  type: string;

  @Column({ type: 'timestamptz' })
  occurredAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Column({ type: 'jsonb' })
  data: Record<string, unknown>;
}
