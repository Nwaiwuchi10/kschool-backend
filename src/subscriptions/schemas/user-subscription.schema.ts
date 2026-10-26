import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { SubscriptionPackage } from './subscription-package.schema';

export type UserSubscriptionDocument = UserSubscription & Document;

@Schema({ timestamps: true })
export class UserSubscription {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: User;

  @Prop({ type: Types.ObjectId, ref: 'SubscriptionPackage', required: true })
  package: SubscriptionPackage;

  @Prop()
  classLevel?: string;

  @Prop({ required: true, unique: true })
  reference: string;

  @Prop({ default: 'paystack' })
  paymentGateway: string;

  @Prop({ required: true })
  amountPaid: number;

  @Prop({ default: Date.now })
  startDate: Date;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ required: true })
  graceExpiresAt: Date;

  @Prop({ default: 'active', enum: ['active', 'grace', 'expired', 'pending'] })
  status: string;

  @Prop({ default: false })
  reminderSent: boolean;

  @Prop({ default: false })
  graceNoticeSent: boolean;

  @Prop({ default: true })
  isActive: boolean;
}

export const UserSubscriptionSchema = SchemaFactory.createForClass(UserSubscription);
