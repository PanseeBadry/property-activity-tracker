import { Controller, Get } from '@nestjs/common';
import { PropertyService } from './property.service';

@Controller('property')
export class PropertyController {
  constructor(private readonly propertyService: PropertyService) {}

  // Add methods for handling property-related requests here
  // For example, you can add a method to get all properties
  @Get()
  getAllProperties() {
    return this.propertyService.getAllProperties();
  }
}
