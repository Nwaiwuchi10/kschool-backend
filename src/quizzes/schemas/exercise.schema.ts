import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ExerciseDocument = Exercise & Document;

@Schema()
export class ExerciseQuestion {
  @Prop({ required: true })
  questionText: string;

  @Prop({ type: [String], default: [] })
  options: string[];

  @Prop({ default: 0 })
  correctOptionIndex: number;

  @Prop({ default: '' })
  hint?: string;

  @Prop({ default: '' })
  explanation?: string;
}

export const ExerciseQuestionSchema = SchemaFactory.createForClass(ExerciseQuestion);

@Schema({ timestamps: true })
export class Exercise {
  @Prop({ required: true })
  title: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ required: true })
  classLevel: string;

  @Prop({ required: true })
  subject: string;

  @Prop({ default: '' })
  topic: string;

  @Prop({ default: '' })
  lesson: string;

  @Prop({ enum: ['published', 'draft', 'archived'], default: 'published' })
  status: string;

  @Prop({ default: 10 })
  points: number;

  @Prop({ default: 15 })
  estimatedMinutes: number;

  @Prop({ type: [ExerciseQuestionSchema], default: [] })
  questions: ExerciseQuestion[];
}

export const ExerciseSchema = SchemaFactory.createForClass(Exercise);
