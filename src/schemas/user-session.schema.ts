import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type UserSessionDocument = UserSession & Document;

export enum SessionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired',
}

@Schema({ timestamps: true })
export class UserSession {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'SalesRep', required: true })
  salesRepId: string;

  @Prop({ required: true, unique: true })
  socketId: string;

  @Prop({ required: true })
  ipAddress: string;

  @Prop({ required: true })
  userAgent: string;

  @Prop({ type: String, enum: SessionStatus, default: SessionStatus.ACTIVE })
  status: SessionStatus;

  @Prop({ default: Date.now })
  connectedAt: Date;

  @Prop({ type: Date, default: null })
  disconnectedAt: Date | null;

  @Prop({ type: Date, default: null })
  lastActivity: Date | null;

  @Prop({ type: Date, default: null })
  lastHeartbeat: Date | null;

  // Geographic location when session started (optional)
  @Prop({
    type: {
      lat: Number,
      lng: Number,
    },
    default: null,
  })
  connectionLocation: {
    lat: number;
    lng: number;
  } | null;

  // Session metadata
  @Prop({ type: Map, of: String, default: {} })
  metadata: Map<string, string>;

  // Duration in milliseconds (calculated on disconnect)
  @Prop({ type: Number, default: 0 })
  sessionDuration: number;
}

export const UserSessionSchema = SchemaFactory.createForClass(UserSession);

// Create indexes for better performance
UserSessionSchema.index({ salesRepId: 1, status: 1 });
UserSessionSchema.index({ socketId: 1 }, { unique: true });
UserSessionSchema.index({ connectedAt: -1 });
UserSessionSchema.index({ status: 1, lastHeartbeat: 1 });