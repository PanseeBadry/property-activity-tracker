import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Put,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { PropertyService } from './property.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';

@ApiTags('Properties')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'Unauthorized - Valid JWT token required',
})
@UseGuards(JwtAuthGuard)
@Controller('property')
export class PropertyController {
  constructor(private readonly propertyService: PropertyService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all properties',
    description: 'Retrieve a list of all properties in the system',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved properties',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'property-uuid' },
          propertyName: { type: 'string', example: 'Sunset Villa' },
          address: {
            type: 'string',
            example: '123 Main Street, New York, NY 10001',
          },
          location: {
            type: 'object',
            properties: {
              lat: { type: 'number', example: 40.7128 },
              lng: { type: 'number', example: -74.006 },
            },
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  async getAllProperties() {
    return this.propertyService.getAllProperties();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get property by ID',
    description: 'Retrieve a specific property by its unique identifier',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Unique identifier of the property',
    example: 'property-uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved property',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'property-uuid' },
        propertyName: { type: 'string', example: 'Sunset Villa' },
        address: {
          type: 'string',
          example: '123 Main Street, New York, NY 10001',
        },
        location: {
          type: 'object',
          properties: {
            lat: { type: 'number', example: 40.7128 },
            lng: { type: 'number', example: -74.006 },
          },
        },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Property not found' })
  async getPropertyById(@Param('id') id: string) {
    return this.propertyService.getPropertyById(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new property',
    description: 'Create a new property in the system',
  })
  @ApiResponse({
    status: 201,
    description: 'Property successfully created',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'property-uuid' },
        propertyName: { type: 'string', example: 'Sunset Villa' },
        address: {
          type: 'string',
          example: '123 Main Street, New York, NY 10001',
        },
        location: {
          type: 'object',
          properties: {
            lat: { type: 'number', example: 40.7128 },
            lng: { type: 'number', example: -74.006 },
          },
        },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input data' })
  async createProperty(@Body() dto: CreatePropertyDto) {
    return this.propertyService.createProperty(dto);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update property',
    description: 'Update an existing property by ID',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Unique identifier of the property to update',
    example: 'property-uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Property successfully updated',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'property-uuid' },
        propertyName: { type: 'string', example: 'Updated Sunset Villa' },
        address: {
          type: 'string',
          example: '123 Main Street, New York, NY 10001',
        },
        location: {
          type: 'object',
          properties: {
            lat: { type: 'number', example: 40.7128 },
            lng: { type: 'number', example: -74.006 },
          },
        },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Property not found' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input data' })
  async updateProperty(
    @Param('id') id: string,
    @Body() dto: UpdatePropertyDto,
  ) {
    return this.propertyService.updateProperty(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete property',
    description: 'Delete a property by ID',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Unique identifier of the property to delete',
    example: 'property-uuid',
  })
  @ApiResponse({ status: 200, description: 'Property successfully deleted' })
  @ApiResponse({ status: 404, description: 'Property not found' })
  async deleteProperty(@Param('id') id: string) {
    return this.propertyService.deleteProperty(id);
  }
}
