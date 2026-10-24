import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Quiz, QuizDocument } from './schemas/quiz.schema';
import { QuizResult, QuizResultDocument } from './schemas/quiz-result.schema';
import { Exercise, ExerciseDocument } from './schemas/exercise.schema';
import { Topic, TopicDocument } from '../subjects/schemas/topic.schema';

@Injectable()
export class QuizzesService {
  constructor(
    @InjectModel(Quiz.name) private quizModel: Model<QuizDocument>,
    @InjectModel(QuizResult.name) private resultModel: Model<QuizResultDocument>,
    @InjectModel(Exercise.name) private exerciseModel: Model<ExerciseDocument>,
    @InjectModel(Topic.name) private topicModel: Model<TopicDocument>,
  ) {}

  async createQuiz(topicId: string, data: any): Promise<Quiz> {
    const quiz = new this.quizModel({ ...data, topic: topicId });
    const saved = await quiz.save();
    try {
      if (Types.ObjectId.isValid(topicId)) {
        await this.topicModel.findByIdAndUpdate(topicId, {
          $addToSet: { quizzes: saved._id },
        });
      }
    } catch (err) {
      // Non-fatal if topic link fails
    }
    return saved;
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

  async findQuizById(id: string): Promise<Quiz> {
    const quiz = await this.quizModel
      .findById(id)
      .populate({
        path: 'topic',
        populate: { path: 'subject' },
      })
      .exec();
    if (!quiz) throw new NotFoundException('Quiz not found');
    return quiz;
  }

  async submitQuiz(userId: string, quizId: string, answers: number[]): Promise<QuizResult> {
    const quiz = await this.findQuizById(quizId);
    
    let score = 0;
    quiz.questions.forEach((q, index) => {
      if (answers[index] === q.correctOptionIndex) {
        score++;
      }
    });

    const totalQuestions = quiz.questions.length;
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
    return exercise.save();
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
    return exercise;
  }

  async deleteExercise(id: string): Promise<void> {
    const exercise = await this.exerciseModel.findByIdAndDelete(id).exec();
    if (!exercise) throw new NotFoundException('Exercise not found');
  }
}
