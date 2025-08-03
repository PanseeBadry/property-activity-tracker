import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type ActivityDocument = Activity & Document;

@Schema()
export class Activity {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'SalesRep' })
  salesRepId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Property' })
  propertyId: string;

  @Prop()
  activityType: string;

  @Prop()
  timestamp: Date;

  @Prop({
    type: {
      lat: Number,
      lng: Number,
    },
  })
  location: {
    lat: number;
    lng: number;
  };

  @Prop()
  note?: string;

  @Prop()
  weight: number;
}

export const ActivitySchema = SchemaFactory.createForClass(Activity);
