import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Put,
} from '@nestjs/common';
import { SalesRepService } from './sales-rep.service';
import { CreateSalesRepDto } from './dto/create-sales-rep.dto';
import { UpdateSalesRepDto } from './dto/update-sales-rep.dto';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('sales-reps')
export class SalesRepController {
  constructor(private readonly salesRepService: SalesRepService) {}

  @Get()
  async findAll() {
    return this.salesRepService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.salesRepService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateSalesRepDto) {
    return this.salesRepService.create(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateSalesRepDto) {
    return this.salesRepService.update(id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.salesRepService.delete(id);
  }
}
