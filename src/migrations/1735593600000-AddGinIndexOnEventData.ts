import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGinIndexOnEventData1735593600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_events_data_gin" ON "events" USING GIN ("data")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_events_data_gin"`);
  }
}
