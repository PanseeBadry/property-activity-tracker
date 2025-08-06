import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  ParseFloatPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { PropertyService } from './property.service';
import { PropertySeederService } from './property-seeder.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { QueryPropertyDto } from './dto/query-property.dto';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';

@Controller('properties')
export class PropertyController {
  constructor(
    private readonly propertyService: PropertyService,
    private readonly propertySeederService: PropertySeederService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(ValidationPipe) createPropertyDto: CreatePropertyDto,
  ) {
    const property = await this.propertyService.create(createPropertyDto);
    return {
      message: 'Property created successfully',
      data: property,
    };
  }

  @Get()
  async findAll(@Query(ValidationPipe) queryDto: QueryPropertyDto) {
    const result = await this.propertyService.findAll(queryDto);
    return {
      message: 'Properties retrieved successfully',
      data: result.properties,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    };
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getStats() {
    const stats = await this.propertyService.getPropertyStats();
    return {
      message: 'Property statistics retrieved successfully',
      data: stats,
    };
  }

  @Post('seed')
  @HttpCode(HttpStatus.OK)
  async seedProperties() {
    await this.propertySeederService.seedSampleProperties();
    return {
      message: 'Sample properties seeded successfully',
    };
  }

  @Get('nearby')
  async findNearby(
    @Query('lat', ParseFloatPipe) lat: number,
    @Query('lng', ParseFloatPipe) lng: number,
    @Query('maxDistance', new ParseIntPipe({ optional: true })) maxDistance?: number,
  ) {
    const properties = await this.propertyService.findNearby(lat, lng, maxDistance);
    return {
      message: 'Nearby properties retrieved successfully',
      data: properties,
    };
  }

  @Get('search/location')
  async findByLocation(
    @Query('lat', ParseFloatPipe) lat: number,
    @Query('lng', ParseFloatPipe) lng: number,
    @Query('radius', ParseFloatPipe) radius: number,
  ) {
    const properties = await this.propertyService.findByLocation(lat, lng, radius);
    return {
      message: 'Properties within location retrieved successfully',
      data: properties,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const property = await this.propertyService.findOne(id);
    return {
      message: 'Property retrieved successfully',
      data: property,
    };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body(ValidationPipe) updatePropertyDto: UpdatePropertyDto,
  ) {
    const property = await this.propertyService.update(id, updatePropertyDto);
    return {
      message: 'Property updated successfully',
      data: property,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    const result = await this.propertyService.remove(id);
    return {
      message: result.message,
    };
  }

  @Delete(':id/hard')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async hardDelete(@Param('id') id: string) {
    const result = await this.propertyService.hardDelete(id);
    return {
      message: result.message,
    };
  }

  // Legacy endpoint for backward compatibility
  @Get('legacy/all')
  async getAllProperties() {
    const properties = await this.propertyService.getAllProperties();
    return {
      message: 'All properties retrieved successfully',
      data: properties,
    };
  }
}
