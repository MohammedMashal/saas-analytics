import { ArrayNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { CreateEventDto } from './create-single-event.dto';
import { Type } from 'class-transformer';

export class BulkCreateEventDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateEventDto)
  events: CreateEventDto[];
}
