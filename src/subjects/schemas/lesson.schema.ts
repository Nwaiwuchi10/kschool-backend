import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Topic } from './topic.schema';

export type LessonDocument = Lesson & Document;

@Schema({ timestamps: true })
export class Lesson {
  @Prop({ required: true })
  title: string;

  @Prop({ type: Types.ObjectId, ref: 'Topic', required: true })
  topic: Topic;

  @Prop()
  content: string; // Markdown or HTML string for written content

  @Prop()
  videoUrl?: string;

  // Text-to-Speech & Audio Metadata
  @Prop()
  audioUrl?: string;

  @Prop({ default: 0 })
  audioDuration?: number; // duration in seconds

  @Prop({ default: 'none', enum: ['none', 'generating', 'ready', 'error'] })
  audioStatus: string;

  @Prop({ default: 'en-US-Neural2-F' })
  audioVoice?: string;

  @Prop()
  audioGeneratedAt?: Date;

  @Prop({ default: 1 })
  audioVersion: number;

  @Prop()
  contentHash?: string; // SHA-256 hash of lesson content for change tracking

  @Prop({ default: 'published', enum: ['published', 'draft', 'archived'] })
  status: string;

  @Prop({ default: 1 })
  order: number;

  @Prop({ default: 5 })
  readTime?: number; // in minutes
}

export const LessonSchema = SchemaFactory.createForClass(Lesson);
