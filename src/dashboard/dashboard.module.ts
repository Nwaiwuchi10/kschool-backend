import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Announcement, AnnouncementSchema } from './schemas/announcement.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { SchoolClass, SchoolClassSchema } from '../classes/schemas/class.schema';
import { Subject, SubjectSchema } from '../subjects/schemas/subject.schema';
import { Lesson, LessonSchema } from '../subjects/schemas/lesson.schema';
import { Quiz, QuizSchema } from '../quizzes/schemas/quiz.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Announcement.name, schema: AnnouncementSchema },
      { name: User.name, schema: UserSchema },
      { name: SchoolClass.name, schema: SchoolClassSchema },
      { name: Subject.name, schema: SubjectSchema },
      { name: Lesson.name, schema: LessonSchema },
      { name: Quiz.name, schema: QuizSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
