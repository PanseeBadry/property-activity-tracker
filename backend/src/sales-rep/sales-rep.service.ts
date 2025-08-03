import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SalesRep, SalesRepDocument } from 'src/schemas/sales-rep.schema';
import { Socket } from 'socket.io';
import { SocketGateway } from 'src/socket/socket.gateway';
import { Activity, ActivityDocument } from 'src/schemas/activity.schema';
import { CreateSalesRepDto } from './dto/create-sales-rep.dto';
import { UpdateSalesRepDto } from './dto/update-sales-rep.dto';

@Injectable()
export class SalesRepService {
  constructor(
    @InjectModel(SalesRep.name)
    private salesRepModel: Model<SalesRepDocument>,
    @InjectModel(Activity.name)
    private activityModel: Model<ActivityDocument>,
    private socketGateway: SocketGateway,
  ) {}

  async findAll(): Promise<SalesRep[]> {
    return this.salesRepModel.find();
  }

  async findOne(id: string): Promise<SalesRep> {
    const rep = await this.salesRepModel.findById(id);
    if (!rep) throw new NotFoundException('SalesRep not found');
    return rep;
  }

  async create(dto: CreateSalesRepDto): Promise<SalesRep> {
    const rep = new this.salesRepModel(dto);
    return rep.save();
  }

  async update(id: string, dto: UpdateSalesRepDto): Promise<SalesRep> {
    const rep = await this.salesRepModel.findByIdAndUpdate(id, dto, {
      new: true,
    });
    if (!rep) throw new NotFoundException('SalesRep not found');
    return rep;
  }

  async delete(id: string): Promise<{ message: string }> {
    const rep = await this.salesRepModel.findByIdAndDelete(id);
    if (!rep) throw new NotFoundException('SalesRep not found');
    return { message: 'SalesRep deleted successfully' };
  }

  async setOnline(salesRepId: string) {
    await this.salesRepModel.findByIdAndUpdate(salesRepId, {
      isOnline: true,
    });
  }

  async setOffline(salesRepId: string) {
    await this.salesRepModel.findByIdAndUpdate(salesRepId, {
      isOnline: false,
      lastOnline: new Date(),
    });
  }

  async sendReplayToUser(salesRepId: string, socket: Socket) {
    const rep = await this.salesRepModel.findById(salesRepId);
    if (!rep || !rep.lastOnline) return;

    const missedActivities = await this.activityModel
      .find({ timestamp: { $gt: rep.lastOnline } })
      .sort({ timestamp: 1 })
      .populate('salesRepId propertyId');

    this.socketGateway.sendReplayActivities(socket, missedActivities);
  }
}
