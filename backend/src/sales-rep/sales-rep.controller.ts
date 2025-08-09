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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SalesRepService } from './sales-rep.service';
import { CreateSalesRepDto } from './dto/create-sales-rep.dto';
import { UpdateSalesRepDto } from './dto/update-sales-rep.dto';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';

@ApiTags('Sales Representatives')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'Unauthorized - Valid JWT token required',
})
@Controller('sales-reps')
export class SalesRepController {
  constructor(private readonly salesRepService: SalesRepService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({
    summary: 'Get all sales representatives',
    description: 'Retrieve a list of all sales representatives in the system',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved sales representatives',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'uuid-string' },
          name: { type: 'string', example: 'John Smith' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  async findAll() {
    return this.salesRepService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiOperation({
    summary: 'Get sales representative by ID',
    description:
      'Retrieve a specific sales representative by their unique identifier',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Unique identifier of the sales representative',
    example: 'uuid-string',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved sales representative',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'uuid-string' },
        name: { type: 'string', example: 'John Smith' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Sales representative not found' })
  async findOne(@Param('id') id: string) {
    return this.salesRepService.findOne(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new sales representative',
    description: 'Create a new sales representative in the system',
  })
  @ApiResponse({
    status: 201,
    description: 'Sales representative successfully created',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'uuid-string' },
        name: { type: 'string', example: 'John Smith' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input data' })
  async create(@Body() dto: CreateSalesRepDto) {
    return this.salesRepService.create(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  @ApiOperation({
    summary: 'Update sales representative',
    description: 'Update an existing sales representative by ID',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Unique identifier of the sales representative to update',
    example: 'uuid-string',
  })
  @ApiResponse({
    status: 200,
    description: 'Sales representative successfully updated',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'uuid-string' },
        name: { type: 'string', example: 'John Smith Updated' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Sales representative not found' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input data' })
  async update(@Param('id') id: string, @Body() dto: UpdateSalesRepDto) {
    return this.salesRepService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiOperation({
    summary: 'Delete sales representative',
    description: 'Delete a sales representative by ID',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Unique identifier of the sales representative to delete',
    example: 'uuid-string',
  })
  @ApiResponse({
    status: 200,
    description: 'Sales representative successfully deleted',
  })
  @ApiResponse({ status: 404, description: 'Sales representative not found' })
  async delete(@Param('id') id: string) {
    return this.salesRepService.delete(id);
  }
}
