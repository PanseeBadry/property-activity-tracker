import { Controller, Get } from '@nestjs/common';
import { SalesRepService } from './sales-rep.service';

@Controller('sales-reps')
export class SalesRepController {
  constructor(private readonly salesRepService: SalesRepService) {}

  // 1. GET /sales-reps
  @Get()
  async getAllReps() {
    return this.salesRepService.findAll();
  }
}
