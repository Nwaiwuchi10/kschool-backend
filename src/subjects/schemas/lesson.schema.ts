import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Topic } from './topic.schema';

export type LessonDocument = Lesson & Document;

@Schema({ timestamps: true })
export class Lesson {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ type: Types.ObjectId, ref: 'Topic', required: false })
  topic?: Topic;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Subject' }], default: [] })
  subjects: Types.ObjectId[]; // Linked subjects (e.g. English Language)

  @Prop({ type: [String], default: [] })
  classes: string[]; // Linked classes (e.g. ["JSS 1", "JSS 2", "Primary 5"])

  @Prop({ default: '' })
  content: string; // Markdown or HTML string for written content

  // Multiple Cloudinary images for lesson illustrations / visual aids
  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop()
  videoUrl?: string;

  // Recorded Voice Note per lesson (Cloudinary audio recording, max 10MB)
  @Prop()
  voiceNoteUrl?: string;

  @Prop({ default: 0 })
  voiceNoteDuration?: number; // duration in seconds

  // Attached Quiz / Exercise for this lesson
  @Prop({ type: Types.ObjectId, ref: 'Quiz', required: false })
  quiz?: Types.ObjectId;

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
