import { Injectable } from '@nestjs/common';
import { CreateAggregateDto } from './dto/create-aggregate.dto';
import { UpdateAggregateDto } from './dto/update-aggregate.dto';

@Injectable()
export class AggregatesService {
  create(createAggregateDto: CreateAggregateDto) {
    return 'This action adds a new aggregate';
  }

  findAll() {
    return `This action returns all aggregates`;
  }

  findOne(id: number) {
    return `This action returns a #${id} aggregate`;
  }

  update(id: number, updateAggregateDto: UpdateAggregateDto) {
    return `This action updates a #${id} aggregate`;
  }

  remove(id: number) {
    return `This action removes a #${id} aggregate`;
  }
}
