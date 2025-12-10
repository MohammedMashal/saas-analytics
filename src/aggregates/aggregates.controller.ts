import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AggregatesService } from './aggregates.service';
import { CreateAggregateDto } from './dto/create-aggregate.dto';
import { UpdateAggregateDto } from './dto/update-aggregate.dto';

@Controller('aggregates')
export class AggregatesController {
  constructor(private readonly aggregatesService: AggregatesService) {}

  @Post()
  create(@Body() createAggregateDto: CreateAggregateDto) {
    return this.aggregatesService.create(createAggregateDto);
  }

  @Get()
  findAll() {
    return this.aggregatesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.aggregatesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAggregateDto: UpdateAggregateDto) {
    return this.aggregatesService.update(+id, updateAggregateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.aggregatesService.remove(+id);
  }
}
