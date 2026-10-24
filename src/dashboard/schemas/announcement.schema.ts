import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AnnouncementDocument = Announcement & Document;

@Schema({ timestamps: true })
export class Announcement {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop({ default: 'All Students & Guardians' })
  audience: string;

  @Prop({ default: false })
  pinned: boolean;

  @Prop({ default: 'School Administrator' })
  authorName: string;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const AnnouncementSchema = SchemaFactory.createForClass(Announcement);
