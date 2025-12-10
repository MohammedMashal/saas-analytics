import { PartialType } from '@nestjs/mapped-types';
import { CreateAggregateDto } from './create-aggregate.dto';

export class UpdateAggregateDto extends PartialType(CreateAggregateDto) {}
