import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Activity, ActivityDocument } from 'src/schemas/activity.schema';
import { SalesRep, SalesRepDocument } from 'src/schemas/sales-rep.schema';
import { CreateActivityDto } from './dto/create-activity.dto';
import { SocketGateway } from 'src/socket/socket.gateway';
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

    const rep = await this.salesRepModel.findByIdAndUpdate(
      salesRepId,
      {
        $inc: { score: weight },
      },
      { new: true },
    );

    if (!rep) {
      throw new Error('SalesRep not found');
    }

    this.socketGateway.broadcastNewActivity(saved);

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
    // console.log('Activity created:', saved);

    return {
      message: 'Activity created successfully',
      activity: saved,
    };
  }

  async getActivities(): Promise<Activity[]> {
    return this.activityModel.find().populate('salesRepId propertyId').exec();
  }
}
