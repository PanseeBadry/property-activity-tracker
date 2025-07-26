import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SalesRepDocument = SalesRep & Document;

@Schema()
export class SalesRep {
  @Prop({ required: true })
  name: string;

  @Prop({ default: false })
  isOnline: boolean;

  @Prop({ default: 0 })
  score: number;

  @Prop({ type: Date, default: null })
  lastOnline: Date | null;
}

export const SalesRepSchema = SchemaFactory.createForClass(SalesRep);
