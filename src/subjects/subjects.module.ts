import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SubjectsService } from './subjects.service';
import { SubjectsController } from './subjects.controller';
import { Subject, SubjectSchema } from './schemas/subject.schema';
import { Topic, TopicSchema } from './schemas/topic.schema';
import { Lesson, LessonSchema } from './schemas/lesson.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Subject.name, schema: SubjectSchema },
      { name: Topic.name, schema: TopicSchema },
      { name: Lesson.name, schema: LessonSchema },
    ]),
  ],
  controllers: [SubjectsController],
  providers: [SubjectsService],
})
export class SubjectsModule {}
