import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PropertyDocument = Property & Document;

@Schema({ timestamps: true })
export class Property {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  address: string;

  @Prop({
    type: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    required: true,
    index: '2dsphere', // Enable geospatial queries
  })
  location: {
    lat: number;
    lng: number;
  };

  @Prop({ required: false })
  description?: string;

  @Prop({ required: false, enum: ['residential', 'commercial', 'industrial', 'land', 'other'] })
  propertyType?: string;

  @Prop({ required: false, min: 0 })
  price?: number;

  @Prop({ default: true })
  isActive: boolean;

  // Timestamps added automatically by Mongoose with timestamps: true
  createdAt?: Date;
  updatedAt?: Date;
}

export const PropertySchema = SchemaFactory.createForClass(Property);
