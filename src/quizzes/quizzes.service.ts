import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Quiz, QuizDocument } from './schemas/quiz.schema';
import { QuizResult, QuizResultDocument } from './schemas/quiz-result.schema';
import { Exercise, ExerciseDocument } from './schemas/exercise.schema';
import { Topic, TopicDocument } from '../subjects/schemas/topic.schema';
import { Lesson, LessonDocument } from '../subjects/schemas/lesson.schema';

@Injectable()
export class QuizzesService {
  constructor(
    @InjectModel(Quiz.name) private quizModel: Model<QuizDocument>,
    @InjectModel(QuizResult.name) private resultModel: Model<QuizResultDocument>,
    @InjectModel(Exercise.name) private exerciseModel: Model<ExerciseDocument>,
    @InjectModel(Topic.name) private topicModel: Model<TopicDocument>,
    @InjectModel(Lesson.name) private lessonModel: Model<LessonDocument>,
  ) {}

  async createQuizGeneric(data: any): Promise<Quiz> {
    const quiz = new this.quizModel(data);
    const saved = await quiz.save();

    // If attached to a lesson, link it to the lesson
    if (data.lesson && Types.ObjectId.isValid(data.lesson)) {
      try {
        await this.lessonModel.findByIdAndUpdate(data.lesson, {
          quiz: saved._id,
        });
      } catch (err) {
        // Non-fatal
      }
    }

    // If attached to a topic, link to topic
    if (data.topic && Types.ObjectId.isValid(data.topic)) {
      try {
        await this.topicModel.findByIdAndUpdate(data.topic, {
          $addToSet: { quizzes: saved._id },
        });
      } catch (err) {
        // Non-fatal
      }
    }

    return saved;
  }

  async createQuiz(topicId: string, data: any): Promise<Quiz> {
    return this.createQuizGeneric({ ...data, topic: topicId });
  }

  async findQuizzesByLesson(lessonId: string): Promise<any[]> {
    const objectId = Types.ObjectId.isValid(lessonId) ? new Types.ObjectId(lessonId) : null;
    const filter = objectId
      ? { $or: [{ lesson: lessonId as any }, { lesson: objectId as any }] }
      : { lesson: lessonId as any };

    // 1. Check legacy Quiz collection
    const quizzes = await this.quizModel.find(filter).lean().exec();

    // 2. Also check Exercise collection where lesson matches ID or title
    let exercises: any[] = [];
    try {
      let lessonTitle = '';
      if (objectId) {
        const lessonDoc = await this.lessonModel.findById(objectId).lean().exec();
        if (lessonDoc) {
          lessonTitle = lessonDoc.title || '';
          // If lesson has explicit exercises populated or attached:
          if (Array.isArray(lessonDoc.exercises) && lessonDoc.exercises.length > 0) {
            const attachedEx = await this.exerciseModel
              .find({ _id: { $in: lessonDoc.exercises } })
              .lean()
              .exec();
            exercises.push(...attachedEx);
          }
          if (lessonDoc.quiz) {
            const attachedQ = await this.exerciseModel
              .findById(lessonDoc.quiz)
              .lean()
              .exec();
            if (attachedQ) exercises.push(attachedQ);
          }
        }
      }

      const exerciseFilter: any[] = [{ lesson: lessonId }];
      if (objectId) exerciseFilter.push({ lesson: objectId.toString() });
      if (lessonTitle) exerciseFilter.push({ lesson: lessonTitle });

      const directExercises = await this.exerciseModel
        .find({ $or: exerciseFilter })
        .lean()
        .exec();
      exercises.push(...directExercises);
    } catch (e) {
      // Ignore
    }

    // Deduplicate exercises by _id
    const seenEx = new Set<string>();
    const uniqueExercises = exercises.filter((ex) => {
      const id = ex?._id?.toString();
      if (!id || seenEx.has(id)) return false;
      seenEx.add(id);
      return true;
    });

    // Format exercises into quiz shape with questions
    const formattedExercises = uniqueExercises.map((ex) => ({
      _id: ex._id,
      title: ex.title,
      topic: ex.topic || ex.subject,
      lesson: lessonId,
      questions: (ex.questions || []).map((q: any) => ({
        questionText: q.questionText,
        options: q.options || [],
        correctOptionIndex: q.correctOptionIndex ?? 0,
        hint: q.hint || '',
        explanation: q.explanation || '',
      })),
      isExercise: true,
      points: ex.points || 10,
      estimatedMinutes: ex.estimatedMinutes || 15,
    }));

    // Combine both: if any found, return combined list (quizzes + exercises)
    const combined = [...quizzes, ...formattedExercises];
    return combined;
  }

  async findAllQuizzes(): Promise<Quiz[]> {
    return this.quizModel
      .find()
      .populate({
        path: 'topic',
        populate: { path: 'subject' },
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findQuizById(id: string): Promise<any> {
    const quiz = await this.quizModel
      .findById(id)
      .populate({
        path: 'topic',
        populate: { path: 'subject' },
      })
      .exec();
    if (quiz) return quiz;

    // Fallback to Exercise document so exercise seamlessly functions as quiz
    const exercise = await this.exerciseModel.findById(id).exec();
    if (exercise) {
      return {
        _id: exercise._id,
        title: exercise.title,
        description: exercise.description,
        topic: exercise.topic,
        lesson: exercise.lesson,
        questions: exercise.questions,
        points: exercise.points,
        estimatedMinutes: exercise.estimatedMinutes,
        createdAt: (exercise as any).createdAt,
      };
    }

    throw new NotFoundException('Quiz or Exercise not found');
  }

  async submitQuiz(userId: string, quizId: string, answers: number[]): Promise<QuizResult> {
    const quiz = await this.findQuizById(quizId);
    
    let score = 0;
    const questions = quiz.questions || [];
    questions.forEach((q: any, index: number) => {
      if (answers[index] === q.correctOptionIndex) {
        score++;
      }
    });

    const totalQuestions = questions.length || 1;
    const passed = (score / totalQuestions) >= 0.7; // 70% passing grade

    const result = new this.resultModel({
      user: userId,
      quiz: quizId,
      score,
      totalQuestions,
      passed,
    });

    return result.save();
  }

  async findQuizzesByTopic(topicId: string): Promise<Quiz[]> {
    const objectId = Types.ObjectId.isValid(topicId) ? new Types.ObjectId(topicId) : null;
    const filter = objectId
      ? { $or: [{ topic: topicId as any }, { topic: objectId as any }] }
      : { topic: topicId as any };
    return (this.quizModel.find(filter).exec()) as any;
  }

  async updateQuiz(id: string, data: any): Promise<Quiz> {
    const quiz = await this.quizModel.findByIdAndUpdate(id, data, { new: true }).exec();
    if (!quiz) throw new NotFoundException('Quiz not found');
    return quiz;
  }

  async deleteQuiz(id: string): Promise<void> {
    const quiz = await this.quizModel.findByIdAndDelete(id).exec();
    if (!quiz) throw new NotFoundException('Quiz not found');
  }

  async getUserResults(userId: string): Promise<QuizResult[]> {
    return this.resultModel.find({ user: userId } as any).populate('quiz').exec() as unknown as QuizResult[];
  }

  // ==========================================
  // EXERCISES / PRACTICE SHEETS
  // ==========================================
  async createExercise(data: any): Promise<Exercise> {
    const exercise = new this.exerciseModel(data);
    const saved = await exercise.save();

    // If linked to a lesson, attach this exercise to the lesson
    if (data.lesson && data.lesson.trim()) {
      try {
        const isObjectId = Types.ObjectId.isValid(data.lesson);
        const lessonFilter = isObjectId
          ? { $or: [{ _id: data.lesson }, { title: data.lesson.trim() }] }
          : { title: data.lesson.trim() };

        await this.lessonModel.updateMany(lessonFilter, {
          $addToSet: { exercises: saved._id },
          $setOnInsert: { quiz: saved._id },
        });
        // Ensure quiz field is populated if null
        await this.lessonModel.updateMany(
          { ...lessonFilter, quiz: { $exists: false } },
          { $set: { quiz: saved._id } },
        );
      } catch (err) {
        // Non-fatal
      }
    }

    return saved;
  }

  async findAllExercises(filter?: { classLevel?: string; subject?: string }): Promise<Exercise[]> {
    const query: any = {};
    if (filter?.classLevel) {
      query.classLevel = { $regex: new RegExp(`^${filter.classLevel.trim()}$`, 'i') };
    }
    if (filter?.subject) {
      query.subject = { $regex: new RegExp(`^${filter.subject.trim()}$`, 'i') };
    }
    return this.exerciseModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async findExerciseById(id: string): Promise<Exercise> {
    const exercise = await this.exerciseModel.findById(id).exec();
    if (!exercise) throw new NotFoundException('Exercise not found');
    return exercise;
  }

  async updateExercise(id: string, data: any): Promise<Exercise> {
    const exercise = await this.exerciseModel.findByIdAndUpdate(id, data, { new: true }).exec();
    if (!exercise) throw new NotFoundException('Exercise not found');

    // If linked to a lesson on update, attach to lesson
    if (data.lesson && data.lesson.trim()) {
      try {
        const isObjectId = Types.ObjectId.isValid(data.lesson);
        const lessonFilter = isObjectId
          ? { $or: [{ _id: data.lesson }, { title: data.lesson.trim() }] }
          : { title: data.lesson.trim() };

        await this.lessonModel.updateMany(lessonFilter, {
          $addToSet: { exercises: exercise._id },
        });
      } catch (err) {
        // Non-fatal
      }
    }

    return exercise;
  }

  async deleteExercise(id: string): Promise<void> {
    const exercise = await this.exerciseModel.findByIdAndDelete(id).exec();
    if (!exercise) throw new NotFoundException('Exercise not found');

    // Remove from any lessons that attached it
    try {
      await this.lessonModel.updateMany(
        { exercises: exercise._id },
        { $pull: { exercises: exercise._id } },
      );
    } catch (err) {
      // Non-fatal
    }
  }
}
