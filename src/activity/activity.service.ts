import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Activity, ActivityDocument } from 'src/schemas/activity.schema';
import { SalesRep, SalesRepDocument } from 'src/schemas/sales-rep.schema';
import { CreateActivityDto } from './dto/create-activity.dto';
import { SocketGateway } from 'src/socket/socket.gateway';

@Injectable()
export class ActivityService {
  constructor(
    @InjectModel(Activity.name) private activityModel: Model<ActivityDocument>,
    @InjectModel(SalesRep.name) private salesRepModel: Model<SalesRepDocument>,
    private socketGateway: SocketGateway,
  ) {}
  async createActivity(dto: CreateActivityDto, salesRepId: string) {
    const activity = new this.activityModel({
      ...dto,
      salesRepId,
    });

    const saved = await activity.save();
    const rep = await this.salesRepModel.findByIdAndUpdate(
      salesRepId,
      {
        $inc: { score: dto.weight },
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

    if (dto.weight >= 8) {
      this.socketGateway.broadcastNotification(
        `${rep.name} had an opportunity!`,
      );
    }

    return {
      message: 'Activity created successfully',
      activity: saved,
    };
  }

  async getActivities(): Promise<Activity[]> {
    return this.activityModel.find().populate('salesRepId propertyId').exec();
  }
}
