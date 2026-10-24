import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { TtsService } from './tts.service';
import { TtsController } from './tts.controller';
import { Lesson, LessonSchema } from '../subjects/schemas/lesson.schema';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Lesson.name, schema: LessonSchema }]),
    ConfigModule,
    CloudinaryModule,
  ],
  controllers: [TtsController],
  providers: [TtsService],
  exports: [TtsService],
})
export class TtsModule {}
