import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { Activity, ActivityDocument } from 'src/schemas/activity.schema';
import { SalesRep, SalesRepDocument } from 'src/schemas/sales-rep.schema';
import { CreateActivityDto } from './dto/create-activity.dto';
import { SocketGateway } from 'src/socket/socket.gateway';
import { UpdateActivityDto } from './dto/update-activity.dto'; // أنشئ هذا الملف لاحقًا

const WEIGHT_MAP = {
  visit: 5,
  call: 2,
  inspection: 8,
  'follow-up': 4,
  note: 1,
};

@Injectable()
export class ActivityService {
  constructor(
    @InjectModel(Activity.name) private activityModel: Model<ActivityDocument>,
    @InjectModel(SalesRep.name) private salesRepModel: Model<SalesRepDocument>,
    private socketGateway: SocketGateway,
  ) {}

  async createActivity(dto: CreateActivityDto, salesRepId: string) {
    const weight = WEIGHT_MAP[dto.activityType] || 1;

    const activity = new this.activityModel({
      ...dto,
      weight,
      salesRepId,
    });

    const saved = await activity.save();
    const populatedActivity = await saved.populate('salesRepId propertyId');

    const rep = await this.salesRepModel.findByIdAndUpdate(
      salesRepId,
      { $inc: { score: weight } },
      { new: true },
    );

    if (!rep) throw new Error('SalesRep not found');

    this.socketGateway.broadcastNewActivity(populatedActivity);

    if (rep.score >= 100) {
      this.socketGateway.broadcastNotification(
        `${rep.name} reached 100 points!`,
      );
    }

    if (weight >= 8) {
      this.socketGateway.broadcastNotification(
        `${rep.name} had an opportunity!`,
      );
    }

    return {
      message: 'Activity created successfully',
      activity: populatedActivity,
    };
  }

  async getActivities(filters?: {
    salesRepId?: string;
    activityType?: string;
  }): Promise<Activity[]> {
    const query: FilterQuery<ActivityDocument> = {};

    if (filters?.salesRepId) {
      query.salesRepId = filters.salesRepId;
    }

    if (filters?.activityType) {
      query.activityType = filters.activityType;
    }

    return this.activityModel.find(query).populate('salesRepId propertyId');
  }

  async getActivityById(id: string) {
    return this.activityModel.findById(id).populate('salesRepId propertyId');
  }

  async updateActivity(id: string, dto: UpdateActivityDto): Promise<Activity> {
    const updated = await this.activityModel.findByIdAndUpdate(id, dto, {
      new: true,
    });
    if (!updated) {
      throw new Error('Activity not found');
    }
    return updated.populate('salesRepId propertyId');
  }

  async deleteActivity(id: string): Promise<{ message: string }> {
    await this.activityModel.findByIdAndDelete(id);
    return { message: 'Activity deleted successfully' };
  }
}
