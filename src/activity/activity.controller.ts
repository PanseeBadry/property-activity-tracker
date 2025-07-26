import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';
@UseGuards(JwtAuthGuard)
@Controller('activities')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}
  @Post()
  async create(@Body() createActivityDto: CreateActivityDto, @Req() req: any) {
    const salesRepId = req.user.userId;
    return this.activityService.createActivity(createActivityDto, salesRepId);
  }

  @Get()
  async findAll() {
    return this.activityService.getActivities();
  }
}
