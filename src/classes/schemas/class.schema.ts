import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SchoolClassDocument = SchoolClass & Document;

export enum ClassCategory {
  PRIMARY = 'Primary',
  JUNIOR_SECONDARY = 'Junior Secondary',
  SENIOR_SECONDARY = 'Senior Secondary',
}

@Schema({ timestamps: true })
export class SchoolClass {
  @Prop({ required: true, unique: true, trim: true })
  name: string; // e.g. "Primary 1", "JSS 1", "SS 3"

  @Prop({ required: true, trim: true })
  code: string; // e.g. "primary-1", "jss-1", "ss-3"

  @Prop({ required: true, enum: ClassCategory, default: ClassCategory.JUNIOR_SECONDARY })
  category: ClassCategory;

  @Prop({ required: true, default: 0 })
  order: number;

  @Prop()
  description?: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const SchoolClassSchema = SchemaFactory.createForClass(SchoolClass);
