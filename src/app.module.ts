import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TenantsModule } from './tenants/tenants.module';
import { EventsModule } from './events/events.module';
import { AggregatesModule } from './aggregates/aggregates.module';
import { JobsModule } from './jobs/jobs.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerModuleOptions } from '@nestjs/throttler';
import { join } from 'path';
import { SummariesModule } from './summaries/summaries.module';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import throttleConfig from './config/throttle.config';
import envValidation from './config/env.validation';

interface ThrottleConfig {
  default: { ttl: number; limit: number };
  events: { ttl: number; limit: number };
  analytics: { ttl: number; limit: number };
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(process.cwd(), `.env.${process.env.NODE_ENV}`),
      load: [appConfig, databaseConfig, throttleConfig],
      validationSchema: envValidation,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (
        configService: ConfigService,
      ): Promise<ThrottlerModuleOptions> => {
        const throttleConfig: ThrottleConfig =
          configService.get<ThrottleConfig>('throttle') || {
            default: { ttl: 60, limit: 10 },
            events: { ttl: 60, limit: 10 },
            analytics: { ttl: 60, limit: 10 },
          };
        return {
          throttlers: [
            {
              name: 'default',
              ttl: throttleConfig.default.ttl,
              limit: throttleConfig.default.limit,
            },
            {
              name: 'events',
              ttl: throttleConfig.events.ttl,
              limit: throttleConfig.events.limit,
            },
            {
              name: 'analytics',
              ttl: throttleConfig.analytics.ttl,
              limit: throttleConfig.analytics.limit,
            },
          ],
        };
      },
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.name'),
        synchronize: configService.get('database.synchronize'),
        autoLoadEntities: true,
      }),
    }),
    TenantsModule,
    EventsModule,
    AggregatesModule,
    JobsModule,
    SummariesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
