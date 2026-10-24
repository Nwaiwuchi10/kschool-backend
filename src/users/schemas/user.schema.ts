import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

export enum UserRole {
  STUDENT = 'student',
  ADMIN = 'admin',
  TEACHER = 'teacher',
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: false })
  password?: string; // Optional for selection hiding and invited teachers

  @Prop()
  phoneNumber: string;

  @Prop()
  class: string;

  @Prop()
  subject?: string;

  @Prop()
  school: string;

  @Prop({ type: String, enum: UserRole, default: UserRole.STUDENT })
  role: UserRole;

  @Prop({ type: [String], default: [] })
  completedLessons: string[];

  @Prop({ type: [String], default: [] })
  attendedTopics: string[];

  @Prop({ default: false })
  freeTrialUsed: boolean;

  @Prop()
  resetPasswordToken?: string;

  @Prop()
  resetPasswordExpires?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Ensure password is not returned in queries by default
UserSchema.set('toJSON', {
  transform: function (doc, ret, options) {
    delete ret.password;
    delete ret.resetPasswordToken;
    delete ret.resetPasswordExpires;
    return ret;
  },
});
