import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  Query,
  Put,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ActivityService } from './activity.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { isValidObjectId } from 'mongoose';

@ApiTags('Activities')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'Unauthorized - Valid JWT token required',
})
@UseGuards(JwtAuthGuard)
@Controller('activities')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new activity',
    description:
      'Create a new activity record. The sales rep ID is automatically extracted from the JWT token.',
  })
  @ApiResponse({
    status: 201,
    description: 'Activity successfully created',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'activity-uuid' },
        propertyId: { type: 'string', example: 'property-uuid' },
        salesRepId: { type: 'string', example: 'salesrep-uuid' },
        activityType: { type: 'string', example: 'visit' },
        timestamp: { type: 'string', format: 'date-time' },
        location: {
          type: 'object',
          properties: {
            lat: { type: 'number', example: 40.7128 },
            lng: { type: 'number', example: -74.006 },
          },
        },
        note: { type: 'string', example: 'Client meeting completed' },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input data' })
  async createActivity(
    @Body() createActivityDto: CreateActivityDto,
    @Req() req: any,
  ) {
    const salesRepId = req.user.userId;
    return this.activityService.createActivity(createActivityDto, salesRepId);
  }

  @Get()
  @ApiOperation({
    summary: 'Get activities with filters',
    description:
      'Retrieve activities with optional filtering by activity type, sales rep, or property',
  })
  @ApiQuery({
    name: 'activityType',
    required: false,
    enum: ['visit', 'call', 'inspection', 'follow-up', 'note'],
    description: 'Filter by activity type',
  })
  @ApiQuery({
    name: 'salesRepId',
    required: false,
    type: String,
    description: 'Filter by sales representative ID',
    example: '64d8c0d61c4e5f001f7edabc', // valid ObjectId
  })
  @ApiQuery({
    name: 'propertyId',
    required: false,
    type: String,
    description: 'Filter by property ID',
    example: '64d8c0d61c4e5f001f7ed123', // valid ObjectId
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved activities',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'activity-uuid' },
          propertyId: { type: 'string', example: 'property-uuid' },
          salesRepId: { type: 'string', example: 'salesrep-uuid' },
          activityType: { type: 'string', example: 'visit' },
          timestamp: { type: 'string', format: 'date-time' },
          location: {
            type: 'object',
            properties: {
              lat: { type: 'number', example: 40.7128 },
              lng: { type: 'number', example: -74.006 },
            },
          },
          note: { type: 'string', example: 'Client meeting completed' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  async getActivities(
    @Query('activityType') activityType?: string,
    @Query('salesRepId') salesRepId?: string,
    @Query('propertyId') propertyId?: string,
  ) {
    const filters: any = {};

    if (activityType) {
      filters.activityType = activityType;
    }

    if (salesRepId && isValidObjectId(salesRepId)) {
      filters.salesRepId = salesRepId;
    }

    if (propertyId && isValidObjectId(propertyId)) {
      filters.propertyId = propertyId;
    }

    return this.activityService.getActivities(filters);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get activity by ID',
    description: 'Retrieve a specific activity by its unique identifier',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Unique identifier of the activity',
    example: 'activity-uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved activity',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'activity-uuid' },
        propertyId: { type: 'string', example: 'property-uuid' },
        salesRepId: { type: 'string', example: 'salesrep-uuid' },
        activityType: { type: 'string', example: 'visit' },
        timestamp: { type: 'string', format: 'date-time' },
        location: {
          type: 'object',
          properties: {
            lat: { type: 'number', example: 40.7128 },
            lng: { type: 'number', example: -74.006 },
          },
        },
        note: { type: 'string', example: 'Client meeting completed' },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Activity not found' })
  async getActivityById(@Param('id') id: string) {
    return this.activityService.getActivityById(id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update activity',
    description: 'Update an existing activity by ID',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Unique identifier of the activity to update',
    example: 'activity-uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Activity successfully updated',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'activity-uuid' },
        propertyId: { type: 'string', example: 'property-uuid' },
        salesRepId: { type: 'string', example: 'salesrep-uuid' },
        activityType: { type: 'string', example: 'visit' },
        timestamp: { type: 'string', format: 'date-time' },
        location: {
          type: 'object',
          properties: {
            lat: { type: 'number', example: 40.7128 },
            lng: { type: 'number', example: -74.006 },
          },
        },
        note: { type: 'string', example: 'Updated client meeting notes' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Activity not found' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input data' })
  async updateActivity(
    @Param('id') id: string,
    @Body() updateDto: UpdateActivityDto,
  ) {
    return this.activityService.updateActivity(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete activity',
    description: 'Delete an activity by ID',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Unique identifier of the activity to delete',
    example: 'activity-uuid',
  })
  @ApiResponse({ status: 200, description: 'Activity successfully deleted' })
  @ApiResponse({ status: 404, description: 'Activity not found' })
  async deleteActivity(@Param('id') id: string) {
    return this.activityService.deleteActivity(id);
  }
}
