import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SubscriptionPackageDocument = SubscriptionPackage & Document;

@Schema({ timestamps: true })
export class SubscriptionPackage {
  @Prop({ required: true })
  name: string; // e.g., "JSS 1 Learning Package"

  @Prop({ required: true })
  academicSession: string; // e.g., "2026/2027"

  @Prop({ required: true })
  price: number; // e.g., 25000

  @Prop({ type: [String], default: [] })
  features: string[];
}

export const SubscriptionPackageSchema = SchemaFactory.createForClass(SubscriptionPackage);
