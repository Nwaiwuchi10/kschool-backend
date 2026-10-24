import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Topic } from '../../subjects/schemas/topic.schema';

export type QuizDocument = Quiz & Document;

@Schema()
export class Question {
  @Prop({ required: true })
  questionText: string;

  @Prop({ type: [String], required: true })
  options: string[];

  @Prop({ required: true })
  correctOptionIndex: number;
}
export const QuestionSchema = SchemaFactory.createForClass(Question);

@Schema({ timestamps: true })
export class Quiz {
  @Prop({ required: true })
  title: string;

  @Prop({ type: Types.ObjectId, ref: 'Topic', required: true })
  topic: Topic;

  @Prop({ type: [QuestionSchema], default: [] })
  questions: Question[];
}

export const QuizSchema = SchemaFactory.createForClass(Quiz);
