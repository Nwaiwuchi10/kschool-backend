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

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private formatExerciseAsQuiz(ex: any, fallbackLessonId?: string, fallbackTopicId?: string) {
    return {
      _id: ex._id,
      title: ex.title,
      topic: ex.topic || fallbackTopicId || ex.subject,
      lesson: fallbackLessonId || ex.lesson,
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
    };
  }

  async findQuizzesByLesson(lessonId: string): Promise<any[]> {
    const objectId = Types.ObjectId.isValid(lessonId) ? new Types.ObjectId(lessonId) : null;
    const filter = objectId
      ? { $or: [{ lesson: lessonId as any }, { lesson: objectId as any }] }
      : { lesson: lessonId as any };

    // 1. Check Quiz collection for direct lesson link
    const quizzes: any[] = await this.quizModel.find(filter).lean().exec();

    // 2. Check Lesson document and Exercise collection for exercises strictly linked to this lesson
    const exercises: any[] = [];
    let lessonDoc: any = null;
    let topicDoc: any = null;
    try {
      if (objectId) {
        lessonDoc = await this.lessonModel
          .findById(objectId)
          .populate('topic')
          .populate('subjects')
          .lean()
          .exec();
      }

      const lessonTitle = (lessonDoc?.title || '').trim();
      if (lessonDoc?.topic) {
        topicDoc =
          typeof lessonDoc.topic === 'object'
            ? lessonDoc.topic
            : await this.topicModel.findById(lessonDoc.topic).lean().exec();
      }

      if (lessonDoc) {
        // Attached exercises array (can reference Exercise or Quiz)
        if (Array.isArray(lessonDoc.exercises) && lessonDoc.exercises.length > 0) {
          const attachedEx = await this.exerciseModel
            .find({ _id: { $in: lessonDoc.exercises } })
            .lean()
            .exec();
          exercises.push(...attachedEx);

          const attachedQuizzes = await this.quizModel
            .find({ _id: { $in: lessonDoc.exercises } })
            .lean()
            .exec();
          quizzes.push(...attachedQuizzes);
        }

        // Attached single quiz field (can reference Quiz or Exercise)
        if (lessonDoc.quiz) {
          const attachedEx = await this.exerciseModel.findById(lessonDoc.quiz).lean().exec();
          if (attachedEx) exercises.push(attachedEx);

          const attachedQuiz = await this.quizModel.findById(lessonDoc.quiz).lean().exec();
          if (attachedQuiz) quizzes.push(attachedQuiz);
        }
      }

      const exerciseFilter: any[] = [{ lesson: lessonId }];
      if (objectId) exerciseFilter.push({ lesson: objectId.toString() });
      if (lessonTitle) {
        exerciseFilter.push({ lesson: lessonTitle });
        exerciseFilter.push({
          lesson: { $regex: new RegExp(`^\\s*${this.escapeRegex(lessonTitle)}\\s*$`, 'i') },
        });
      }

      const directExercises = await this.exerciseModel
        .find({ $or: exerciseFilter })
        .lean()
        .exec();
      exercises.push(...directExercises);

      // 3. If no lesson-specific quiz/exercise found yet, check quizzes/exercises linked to this lesson's topic
      //    that are NOT assigned to a different lesson
      if (quizzes.length === 0 && exercises.length === 0 && topicDoc) {
        const topicIdStr = String(topicDoc._id || lessonDoc.topic);
        const topicObjId = Types.ObjectId.isValid(topicIdStr) ? new Types.ObjectId(topicIdStr) : null;
        const topicFilter = topicObjId
          ? {
              $and: [
                { $or: [{ topic: topicIdStr as any }, { topic: topicObjId as any }] },
                { $or: [{ lesson: { $exists: false } }, { lesson: null }, { lesson: lessonId as any }, { lesson: objectId as any }] },
              ],
            }
          : { topic: topicIdStr as any };

        const topicQuizzes = await this.quizModel.find(topicFilter).lean().exec();
        quizzes.push(...topicQuizzes);

        if (Array.isArray(topicDoc.quizzes) && topicDoc.quizzes.length > 0) {
          const topicLinkedQuizzes = await this.quizModel
            .find({ _id: { $in: topicDoc.quizzes } })
            .lean()
            .exec();
          quizzes.push(...topicLinkedQuizzes);

          const topicLinkedExercises = await this.exerciseModel
            .find({ _id: { $in: topicDoc.quizzes } })
            .lean()
            .exec();
          exercises.push(...topicLinkedExercises);
        }

        const topicTitle = (topicDoc.title || '').trim();
        const topicMatchOr: any[] = [{ topic: topicIdStr }];
        if (topicTitle) {
          topicMatchOr.push({ topic: topicTitle });
          topicMatchOr.push({
            topic: { $regex: new RegExp(`^\\s*${this.escapeRegex(topicTitle)}\\s*$`, 'i') },
          });
        }

        const lessonUnassignedOrMatches: any[] = [
          { lesson: { $exists: false } },
          { lesson: null },
          { lesson: '' },
          { lesson: lessonId },
        ];
        if (lessonTitle) {
          lessonUnassignedOrMatches.push({
            lesson: { $regex: new RegExp(`^\\s*${this.escapeRegex(lessonTitle)}\\s*$`, 'i') },
          });
        }

        const topicExercises = await this.exerciseModel
          .find({
            $and: [{ $or: topicMatchOr }, { $or: lessonUnassignedOrMatches }],
          })
          .lean()
          .exec();
        exercises.push(...topicExercises);
      }
    } catch (e) {
      // Ignore fallback errors
    }

    // Deduplicate quizzes and exercises by _id
    const seenIds = new Set<string>();
    const uniqueQuizzes = quizzes.filter((q) => {
      const id = q?._id?.toString();
      if (!id || seenIds.has(id)) return false;
      seenIds.add(id);
      return Array.isArray(q.questions) && q.questions.length > 0;
    });

    const uniqueExercises = exercises.filter((ex) => {
      const id = ex?._id?.toString();
      if (!id || seenIds.has(id)) return false;
      seenIds.add(id);
      return Array.isArray(ex.questions) && ex.questions.length > 0;
    });

    const formattedExercises = uniqueExercises.map((ex) =>
      this.formatExerciseAsQuiz(ex, lessonId, topicDoc?._id ? String(topicDoc._id) : undefined),
    );

    return [...uniqueQuizzes, ...formattedExercises];
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

  async findQuizzesByTopic(topicId: string, subjectFilter?: string): Promise<any[]> {
    const objectId = Types.ObjectId.isValid(topicId) ? new Types.ObjectId(topicId) : null;
    const filter = objectId
      ? { $or: [{ topic: topicId as any }, { topic: objectId as any }] }
      : { topic: topicId as any };

    const quizzes: any[] = await this.quizModel.find(filter).lean().exec();
    const exercises: any[] = [];
    let subjectNameFromTopic = '';

    try {
      const topicDoc: any = objectId
        ? await this.topicModel.findById(objectId).populate('lessons').populate('subject').lean().exec()
        : null;

      if (topicDoc) {
        if (typeof topicDoc.subject === 'object' && topicDoc.subject?.name) {
          subjectNameFromTopic = topicDoc.subject.name.trim();
        }

        if (Array.isArray(topicDoc.quizzes) && topicDoc.quizzes.length > 0) {
          const linkedQuizzes = await this.quizModel
            .find({ _id: { $in: topicDoc.quizzes } })
            .lean()
            .exec();
          quizzes.push(...linkedQuizzes);

          const linkedExercises = await this.exerciseModel
            .find({ _id: { $in: topicDoc.quizzes } })
            .lean()
            .exec();
          exercises.push(...linkedExercises);
        }

        const topicTitle = (topicDoc.title || '').trim();
        const exOrConditions: any[] = [{ topic: topicId }];
        if (topicTitle) {
          exOrConditions.push({ topic: topicTitle });
          exOrConditions.push({
            topic: { $regex: new RegExp(`^\\s*${this.escapeRegex(topicTitle)}\\s*$`, 'i') },
          });
        }

        if (Array.isArray(topicDoc.lessons) && topicDoc.lessons.length > 0) {
          const lessonIds: any[] = [];
          const lessonObjIds: any[] = [];
          const lessonTitles: string[] = [];
          const attachedExIds: any[] = [];

          topicDoc.lessons.forEach((l: any) => {
            if (l?._id) {
              lessonIds.push(String(l._id));
              if (Types.ObjectId.isValid(String(l._id))) {
                lessonObjIds.push(new Types.ObjectId(String(l._id)));
              }
            }
            if (l?.title) lessonTitles.push(l.title.trim());
            if (Array.isArray(l?.exercises)) attachedExIds.push(...l.exercises);
            if (l?.quiz) attachedExIds.push(l.quiz);
          });

          if (lessonIds.length > 0) {
            exOrConditions.push({ lesson: { $in: lessonIds } });
            const lessonLinkedQuizzes = await this.quizModel
              .find({
                $or: [
                  { lesson: { $in: lessonIds } },
                  ...(lessonObjIds.length > 0 ? [{ lesson: { $in: lessonObjIds } }] : []),
                  ...(attachedExIds.length > 0 ? [{ _id: { $in: attachedExIds } }] : []),
                ],
              })
              .lean()
              .exec();
            quizzes.push(...lessonLinkedQuizzes);
          }
          if (lessonTitles.length > 0) {
            exOrConditions.push({
              lesson: {
                $in: lessonTitles.map((t) => new RegExp(`^\\s*${this.escapeRegex(t)}\\s*$`, 'i')),
              },
            });
          }
          if (attachedExIds.length > 0) {
            exOrConditions.push({ _id: { $in: attachedExIds } });
          }
        }

        const matchedEx = await this.exerciseModel.find({ $or: exOrConditions }).lean().exec();
        exercises.push(...matchedEx);
      }
    } catch (e) {
      // Ignore fallback errors
    }

    const seenIds = new Set<string>();
    const uniqueQuizzes = quizzes.filter((q) => {
      const id = q?._id?.toString();
      if (!id || seenIds.has(id)) return false;
      seenIds.add(id);
      return Array.isArray(q.questions) && q.questions.length > 0;
    });

    const uniqueExercises = exercises.filter((ex) => {
      const id = ex?._id?.toString();
      if (!id || seenIds.has(id)) return false;
      seenIds.add(id);
      return Array.isArray(ex.questions) && ex.questions.length > 0;
    });

    const formattedExercises = uniqueExercises.map((ex) =>
      this.formatExerciseAsQuiz(ex, undefined, topicId),
    );

    const combined = [...uniqueQuizzes, ...formattedExercises];

    // Strict subject-level enforcement: filter out any quiz/exercise explicitly assigned to a different subject
    const activeSubjectName = (subjectFilter || subjectNameFromTopic || '').trim().toLowerCase();
    if (!activeSubjectName) {
      return combined;
    }

    return combined.filter((item: any) => {
      const itemSubject = (item.subject || item.subjectName || '').trim().toLowerCase();
      // If the exercise/quiz specifies a subject, it MUST match the selected subject
      if (itemSubject && itemSubject !== activeSubjectName) {
        return false;
      }
      return true;
    });
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

  async getUserResults(userId: string): Promise<any[]> {
    const rawResults = await this.resultModel.find({ user: userId } as any).lean().exec();
    const populatedResults = await Promise.all(
      rawResults.map(async (r: any) => {
        if (r.quiz) {
          const quizDoc = await this.quizModel.findById(r.quiz).lean().exec();
          if (quizDoc) {
            return { ...r, quiz: quizDoc };
          }
          const exDoc = await this.exerciseModel.findById(r.quiz).lean().exec();
          if (exDoc) {
            return {
              ...r,
              quiz: this.formatExerciseAsQuiz(exDoc),
            };
          }
        }
        return r;
      }),
    );
    return populatedResults;
  }

  // ==========================================
  // EXERCISES / PRACTICE SHEETS
  // ==========================================
  private async syncExerciseLinks(exerciseId: any, data: any) {
    // Link to Topic if topic is provided (by ObjectId or title)
    if (data?.topic && typeof data.topic === 'string' && data.topic.trim()) {
      try {
        const trimmedTopic = data.topic.trim();
        const isTopicObjectId = Types.ObjectId.isValid(trimmedTopic);
        const topicFilter = isTopicObjectId
          ? {
              $or: [
                { _id: trimmedTopic },
                { title: { $regex: new RegExp(`^\\s*${this.escapeRegex(trimmedTopic)}\\s*$`, 'i') } },
              ],
            }
          : { title: { $regex: new RegExp(`^\\s*${this.escapeRegex(trimmedTopic)}\\s*$`, 'i') } };

        await this.topicModel.updateMany(topicFilter, {
          $addToSet: { quizzes: exerciseId },
        });
      } catch {
        // Non-fatal
      }
    }

    // Link to Lesson if lesson is provided (by ObjectId or title)
    if (data?.lesson && typeof data.lesson === 'string' && data.lesson.trim()) {
      try {
        const trimmedLesson = data.lesson.trim();
        const isLessonObjectId = Types.ObjectId.isValid(trimmedLesson);
        const lessonFilter = isLessonObjectId
          ? {
              $or: [
                { _id: trimmedLesson },
                { title: { $regex: new RegExp(`^\\s*${this.escapeRegex(trimmedLesson)}\\s*$`, 'i') } },
              ],
            }
          : { title: { $regex: new RegExp(`^\\s*${this.escapeRegex(trimmedLesson)}\\s*$`, 'i') } };

        await this.lessonModel.updateMany(lessonFilter, {
          $addToSet: { exercises: exerciseId },
        });
        await this.lessonModel.updateMany(
          { ...lessonFilter, quiz: { $exists: false } },
          { $set: { quiz: exerciseId } },
        );
      } catch {
        // Non-fatal
      }
    }
  }

  async createExercise(data: any): Promise<Exercise> {
    const exercise = new this.exerciseModel(data);
    const saved = await exercise.save();
    await this.syncExerciseLinks(saved._id, data);
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
    await this.syncExerciseLinks(exercise._id, data);
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
