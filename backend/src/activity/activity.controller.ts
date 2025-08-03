import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { ActivityService } from './activity.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';
import { UpdateActivityDto } from './dto/update-activity.dto';

@UseGuards(JwtAuthGuard)
@Controller('activities')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Post()
  async createActivity(
    @Body() createActivityDto: CreateActivityDto,
    @Req() req: any,
  ) {
    const salesRepId = req.user.userId;
    return this.activityService.createActivity(createActivityDto, salesRepId);
  }

  @Get()
  async getFilteredActivities(
    @Query('salesRepId') repId?: string,
    @Query('activityType') type?: string,
  ) {
    return this.activityService.getActivities({
      salesRepId: repId,
      activityType: type,
    });
  }

  @Get(':id')
  async getActivityById(@Param('id') id: string) {
    return this.activityService.getActivityById(id);
  }

  @Patch(':id')
  async updateActivity(
    @Param('id') id: string,
    @Body() updateDto: UpdateActivityDto,
  ) {
    return this.activityService.updateActivity(id, updateDto);
  }

  @Delete(':id')
  async deleteActivity(@Param('id') id: string) {
    return this.activityService.deleteActivity(id);
  }
}
