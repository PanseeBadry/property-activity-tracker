import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SalesRep, SalesRepDocument } from 'src/schemas/sales-rep.schema';
import { Socket } from 'socket.io';
import { SocketGateway } from 'src/socket/socket.gateway';
import { Activity, ActivityDocument } from 'src/schemas/activity.schema';

@Injectable()
export class SalesRepService {
  constructor(
    @InjectModel(SalesRep.name)
    private salesRepModel: Model<SalesRepDocument>,
    @InjectModel(Activity.name)
    private activityModel: Model<ActivityDocument>,
    private socketGateway: SocketGateway,
  ) {}

  // 1. Get all sales reps
  async findAll(): Promise<SalesRep[]> {
    return this.salesRepModel.find();
  }

  async sendReplayToUser(salesRepId: string, socket: Socket) {
    const rep = await this.salesRepModel.findById(salesRepId);

    if (!rep || !rep.lastOnline) return;

    const missedActivities = await this.activityModel
      .find({
        timestamp: { $gt: rep.lastOnline },
      })
      .sort({ timestamp: 1 });

    this.socketGateway.sendReplayActivities(socket, missedActivities);
  }
}
