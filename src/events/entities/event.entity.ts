import { Tenant } from 'src/tenants/entities/tenant.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('events')
@Index(['tenantId', 'occurredAt'])
@Index(['tenantId', 'type'])
export class Event {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column({ type: 'uuid' })
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
