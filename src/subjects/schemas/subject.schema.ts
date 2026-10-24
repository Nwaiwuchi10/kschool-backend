import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Topic } from './topic.schema';

export type SubjectDocument = Subject & Document;

@Schema({ timestamps: true })
export class Subject {
  @Prop({ required: true })
  name: string; // e.g. "JSS 1 ENGLISH LANGUAGE"

  @Prop({ required: true })
  classLevel: string; // e.g. "JSS 1"

  @Prop()
  description: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Topic' }] })
  topics: Topic[];
}

export const SubjectSchema = SchemaFactory.createForClass(Subject);
