import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PropertyDocument = Property & Document;

@Schema()
export class Property {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  address: string;

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
}

export const PropertySchema = SchemaFactory.createForClass(Property);
