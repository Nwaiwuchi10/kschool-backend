import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Subject } from './subject.schema';
import { Lesson } from './lesson.schema';
import { Quiz } from '../../quizzes/schemas/quiz.schema';

export type TopicDocument = Topic & Document;

@Schema({ timestamps: true })
export class Topic {
  @Prop({ required: true })
  title: string; // e.g. "Introduction to Motion"

  @Prop({ type: Types.ObjectId, ref: 'Subject', required: true })
  subject: Subject;

  @Prop()
  description?: string;

  @Prop({ default: 1 })
  order: number;

  @Prop({ default: 'published', enum: ['published', 'draft', 'archived'] })
  status: string;

  @Prop({ default: 5 })
  maxLessons: number;

  @Prop({ default: 10 })
  maxQuizQuestions: number;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Lesson' }], default: [] })
  lessons: Lesson[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Quiz' }], default: [] })
  quizzes: Quiz[];
}

export const TopicSchema = SchemaFactory.createForClass(Topic);
