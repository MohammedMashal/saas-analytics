import { IsDateString, IsNotEmpty, IsObject, IsString } from 'class-validator';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsDateString()
  occurredAt: Date;

  @IsObject()
  @IsNotEmpty()
  data: Record<string, any>;
}
