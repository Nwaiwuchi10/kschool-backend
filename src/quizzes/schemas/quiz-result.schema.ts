import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Quiz } from './quiz.schema';

export type QuizResultDocument = QuizResult & Document;

@Schema({ timestamps: true })
export class QuizResult {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: User;

  @Prop({ type: Types.ObjectId, ref: 'Quiz', required: true })
  quiz: Quiz;

  @Prop({ required: true })
  score: number;

  @Prop({ required: true })
  totalQuestions: number;

  @Prop({ required: true })
  passed: boolean;
}

export const QuizResultSchema = SchemaFactory.createForClass(QuizResult);
