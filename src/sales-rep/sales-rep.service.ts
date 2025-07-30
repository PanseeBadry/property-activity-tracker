import { Injectable, forwardRef, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SalesRep, SalesRepDocument } from 'src/schemas/sales-rep.schema';
import { Socket } from 'socket.io';
import { SocketGateway } from 'src/socket/socket.gateway';
import { Activity, ActivityDocument } from 'src/schemas/activity.schema';

export interface CreateSalesRepDto {
  name: string;
  email?: string;
  role?: string;
}

export interface UpdateSalesRepDto {
  name?: string;
  email?: string;
  role?: string;
}

@Injectable()
export class SalesRepService {
  constructor(
    @InjectModel(SalesRep.name)
    private salesRepModel: Model<SalesRepDocument>,
    @InjectModel(Activity.name)
    private activityModel: Model<ActivityDocument>,
    @Inject(forwardRef(() => SocketGateway))
    private socketGateway: SocketGateway,
  ) {}

  /**
   * Get all sales reps with their online status
   */
  async findAll(): Promise<SalesRep[]> {
    return this.salesRepModel.find().exec();
  }

  /**
   * Find sales rep by ID
   */
  async findById(id: string): Promise<SalesRep | null> {
    return this.salesRepModel.findById(id).exec();
  }

  /**
   * Create a new sales rep
   */
  async create(dto: CreateSalesRepDto): Promise<SalesRep> {
    const salesRep = new this.salesRepModel({
      ...dto,
      isOnline: false,
      score: 0,
      lastOnline: null,
    });
    return salesRep.save();
  }

  /**
   * Update sales rep information
   */
  async update(id: string, dto: UpdateSalesRepDto): Promise<SalesRep | null> {
    return this.salesRepModel.findByIdAndUpdate(id, dto, { new: true }).exec();
  }

  /**
   * Delete sales rep
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.salesRepModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  /**
   * Get all currently online sales reps
   */
  async getOnlineReps(): Promise<SalesRep[]> {
    return this.salesRepModel.find({ isOnline: true }).exec();
  }

  /**
   * Get sales rep statistics
   */
  async getRepStats(salesRepId: string): Promise<{
    totalActivities: number;
    totalScore: number;
    averageActivityWeight: number;
    activitiesThisWeek: number;
    activitiesThisMonth: number;
  }> {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalActivities,
      rep,
      avgWeight,
      weekActivities,
      monthActivities,
    ] = await Promise.all([
      this.activityModel.countDocuments({ salesRepId }),
      this.salesRepModel.findById(salesRepId),
      this.activityModel.aggregate([
        { $match: { salesRepId } },
        { $group: { _id: null, avgWeight: { $avg: '$weight' } } }
      ]),
      this.activityModel.countDocuments({
        salesRepId,
        timestamp: { $gte: weekAgo }
      }),
      this.activityModel.countDocuments({
        salesRepId,
        timestamp: { $gte: monthAgo }
      }),
    ]);

    return {
      totalActivities,
      totalScore: rep?.score || 0,
      averageActivityWeight: avgWeight.length > 0 ? avgWeight[0].avgWeight : 0,
      activitiesThisWeek: weekActivities,
      activitiesThisMonth: monthActivities,
    };
  }

  /**
   * Update sales rep score
   */
  async updateScore(salesRepId: string, scoreChange: number): Promise<SalesRep | null> {
    return this.salesRepModel.findByIdAndUpdate(
      salesRepId,
      { $inc: { score: scoreChange } },
      { new: true }
    ).exec();
  }

  /**
   * Reset sales rep score
   */
  async resetScore(salesRepId: string): Promise<SalesRep | null> {
    return this.salesRepModel.findByIdAndUpdate(
      salesRepId,
      { score: 0 },
      { new: true }
    ).exec();
  }

  /**
   * Update online status
   */
  async updateOnlineStatus(salesRepId: string, isOnline: boolean): Promise<SalesRep | null> {
    const updateData: any = { isOnline };
    
    if (!isOnline) {
      updateData.lastOnline = new Date();
    }

    return this.salesRepModel.findByIdAndUpdate(
      salesRepId,
      updateData,
      { new: true }
    ).exec();
  }

  /**
   * Send replay of missed activities to a user
   */
  async sendReplayToUser(salesRepId: string, socket: Socket): Promise<void> {
    try {
      const rep = await this.salesRepModel.findById(salesRepId);

      if (!rep || !rep.lastOnline) {
        // If no lastOnline time, send all recent activities (last 24 hours)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        const recentActivities = await this.activityModel
          .find({
            timestamp: { $gte: yesterday },
            salesRepId: { $ne: salesRepId }, // Exclude own activities
          })
          .populate('salesRepId propertyId')
          .sort({ timestamp: 1 })
          .limit(50) // Limit to prevent overwhelming
          .exec();

        if (recentActivities.length > 0) {
          this.socketGateway.sendReplayActivities(socket, recentActivities);
        }
        return;
      }

      // Get activities that occurred while user was offline
      const missedActivities = await this.activityModel
        .find({
          timestamp: { $gt: rep.lastOnline },
          salesRepId: { $ne: salesRepId }, // Exclude own activities
        })
        .populate('salesRepId propertyId')
        .sort({ timestamp: 1 })
        .limit(100) // Limit to prevent overwhelming
        .exec();

      if (missedActivities.length > 0) {
        // Send replay with metadata about the replay
        socket.emit('activity:replay-start', {
          totalActivities: missedActivities.length,
          timeRange: {
            from: rep.lastOnline,
            to: new Date(),
          },
          message: `Replaying ${missedActivities.length} activities that occurred while you were offline`,
        });

        this.socketGateway.sendReplayActivities(socket, missedActivities);

        socket.emit('activity:replay-complete', {
          message: `Replay complete. ${missedActivities.length} activities processed.`,
          timestamp: new Date().toISOString(),
        });
      } else {
        socket.emit('activity:replay-complete', {
          message: 'No new activities to replay.',
          timestamp: new Date().toISOString(),
        });
      }

    } catch (error) {
      console.error(`Error sending replay to user ${salesRepId}:`, error);
      socket.emit('activity:replay-error', {
        message: 'Failed to load missed activities',
        error: error.message,
      });
    }
  }

  /**
   * Get user activity history
   */
  async getUserActivityHistory(salesRepId: string, limit: number = 20): Promise<Activity[]> {
    return this.activityModel
      .find({ salesRepId })
      .populate('propertyId')
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Check if user exists
   */
  async exists(salesRepId: string): Promise<boolean> {
    const count = await this.salesRepModel.countDocuments({ _id: salesRepId });
    return count > 0;
  }
}
