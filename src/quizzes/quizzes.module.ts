import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QuizzesService } from './quizzes.service';
import { QuizzesController } from './quizzes.controller';
import { Quiz, QuizSchema } from './schemas/quiz.schema';
import { QuizResult, QuizResultSchema } from './schemas/quiz-result.schema';
import { Exercise, ExerciseSchema } from './schemas/exercise.schema';
import { Topic, TopicSchema } from '../subjects/schemas/topic.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Quiz.name, schema: QuizSchema },
      { name: QuizResult.name, schema: QuizResultSchema },
      { name: Exercise.name, schema: ExerciseSchema },
      { name: Topic.name, schema: TopicSchema },
    ]),
  ],
  controllers: [QuizzesController],
  providers: [QuizzesService],
  exports: [QuizzesService],
})
export class QuizzesModule {}
