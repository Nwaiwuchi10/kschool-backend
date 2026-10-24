import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Topic } from './topic.schema';

export type SubjectDocument = Subject & Document;

@Schema({ timestamps: true })
export class Subject {
  @Prop({ required: true, trim: true })
  name: string; // e.g. "English Language", "Mathematics", "Basic Science"

  @Prop({ required: false, default: '' })
  classLevel: string; // e.g. "JSS 1" or primary level (retained for backward compatibility)

  @Prop({ type: [String], default: [] })
  classes: string[]; // Linked classes, e.g. ["JSS 1", "JSS 2", "JSS 3", "SS 1"]

  @Prop()
  description?: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Topic' }] })
  topics: Topic[];
}

export const SubjectSchema = SchemaFactory.createForClass(Subject);

