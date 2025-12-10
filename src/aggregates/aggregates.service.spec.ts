import { Test, TestingModule } from '@nestjs/testing';
import { AggregatesService } from './aggregates.service';

describe('AggregatesService', () => {
  let service: AggregatesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AggregatesService],
    }).compile();

    service = module.get<AggregatesService>(AggregatesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
