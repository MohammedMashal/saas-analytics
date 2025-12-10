import { Test, TestingModule } from '@nestjs/testing';
import { AggregatesController } from './aggregates.controller';
import { AggregatesService } from './aggregates.service';

describe('AggregatesController', () => {
  let controller: AggregatesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AggregatesController],
      providers: [AggregatesService],
    }).compile();

    controller = module.get<AggregatesController>(AggregatesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
