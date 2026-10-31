import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Subject, SubjectDocument } from './schemas/subject.schema';
import { Topic, TopicDocument } from './schemas/topic.schema';
import { Lesson, LessonDocument } from './schemas/lesson.schema';

@Injectable()
export class SubjectsService {
  private readonly logger = new Logger(SubjectsService.name);

  constructor(
    @InjectModel(Subject.name) private subjectModel: Model<SubjectDocument>,
    @InjectModel(Topic.name) private topicModel: Model<TopicDocument>,
    @InjectModel(Lesson.name) private lessonModel: Model<LessonDocument>,
  ) {}

  async seedSubjects(): Promise<{ count: number; message: string }> {
    return { count: 0, message: 'Seeding disabled. Subjects must be created by administrators.' };
  }

  async createSubject(data: any): Promise<Subject> {
    const classes = Array.isArray(data.classes)
      ? data.classes.filter(Boolean)
      : data.classLevel
      ? [data.classLevel]
      : [];
    const primaryClass = classes[0] || data.classLevel || '';

    const subject = new this.subjectModel({
      ...data,
      classes,
      classLevel: primaryClass,
    });
    return subject.save();
  }

  async updateSubject(id: string, data: any): Promise<Subject> {
    const updatePayload: any = { ...data };
    if (Array.isArray(data.classes)) {
      updatePayload.classes = data.classes.filter(Boolean);
      if (!updatePayload.classLevel && updatePayload.classes.length > 0) {
        updatePayload.classLevel = updatePayload.classes[0];
      }
    }
    const updated = await this.subjectModel
      .findByIdAndUpdate(id, updatePayload, { new: true })
      .populate({
        path: 'topics',
        populate: {
          path: 'lessons',
        },
      })
      .exec();
    if (!updated) throw new NotFoundException('Subject not found');
    return updated;
  }

  async deleteSubject(id: string): Promise<void> {
    const deleted = await this.subjectModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException('Subject not found');
  }

  async findAllSubjects(classLevel?: string): Promise<Subject[]> {
    const filter: any = {};
    if (classLevel && classLevel.trim()) {
      const trimmed = classLevel.trim();
      const regex = new RegExp(`^${trimmed}$`, 'i');
      filter.$or = [
        { classes: { $in: [trimmed, regex] } },
        { classLevel: regex },
      ];
    }
    return this.subjectModel.find(filter).populate({
      path: 'topics',
      populate: [
        {
          path: 'lessons',
          populate: [{ path: 'exercises' }, { path: 'quiz' }],
        },
        { path: 'quizzes' },
      ],
    }).exec();
  }

  async findSubjectById(id: string): Promise<any> {
    const subject = await this.subjectModel.findById(id).populate({
      path: 'topics',
      populate: [
        {
          path: 'lessons',
          populate: [{ path: 'exercises' }, { path: 'quiz' }],
        },
        { path: 'quizzes' },
      ],
    }).exec();
    if (!subject) throw new NotFoundException('Subject not found');

    const subjectObj: any = subject.toObject ? subject.toObject() : subject;

    // Find any lessons assigned directly to this subject
    const subjectLessons = await this.lessonModel.find({
      $or: [
        { subjects: id },
        { subjects: { $in: [id] } },
      ],
    }).exec();

    // Also check lessons matching subject name if needed
    const nameMatches = await this.lessonModel.find({
      subjects: { $size: 0 },
      classes: { $in: subjectObj.classes || [] },
    }).exec();

    const allLinkedLessons = [...subjectLessons];
    const existingIds = new Set(allLinkedLessons.map((l: any) => l._id.toString()));

    // Collect all lesson IDs already assigned to topics
    const assignedLessonIds = new Set<string>();
    if (Array.isArray(subjectObj.topics)) {
      subjectObj.topics.forEach((t: any) => {
        if (Array.isArray(t.lessons)) {
          t.lessons.forEach((l: any) => {
            if (l && l._id) assignedLessonIds.add(l._id.toString());
          });
        }
      });
    }

    // If there are unassigned lessons linked to this subject, attach them to the first topic or create a syllabus topic
    const unassigned = allLinkedLessons.filter((l) => !assignedLessonIds.has(l._id.toString()));
    if (unassigned.length > 0) {
      if (!subjectObj.topics || subjectObj.topics.length === 0) {
        subjectObj.topics = [
          {
            _id: 'default-topic-' + id,
            title: 'General Curriculum Lessons',
            subject: id,
            lessons: unassigned,
          },
        ];
      } else {
        subjectObj.topics[0].lessons = [...(subjectObj.topics[0].lessons || []), ...unassigned];
      }
    }

    return subjectObj;
  }

  async createTopic(subjectId: string, data: any): Promise<Topic> {
    const subject = await this.findSubjectById(subjectId);
    const topic = new this.topicModel({ ...data, subject: subjectId });
    const savedTopic = await topic.save();
    
    // Auto-link topic to subject
    subject.topics.push(savedTopic._id as any);
    await (subject as any).save();

    return savedTopic;
  }

  async findTopicById(id: string): Promise<Topic> {
    const topic = await this.topicModel
      .findById(id)
      .populate({
        path: 'lessons',
        populate: [{ path: 'exercises' }, { path: 'quiz' }],
      })
      .populate('quizzes')
      .exec();
    if (!topic) throw new NotFoundException('Topic not found');
    return topic;
  }

  async findLessonsByTopic(topicId: string): Promise<Lesson[]> {
    const topic = await this.topicModel
      .findById(topicId)
      .populate({
        path: 'lessons',
        populate: [{ path: 'exercises' }, { path: 'quiz' }],
      })
      .exec();
    if (!topic) throw new NotFoundException('Topic not found');

    let lessonsList: any[] = (topic.lessons as any) || [];

    // Also query lessons collection directly where topic matches topicId (handles direct topic links)
    const topicObjectId = Types.ObjectId.isValid(topicId) ? new Types.ObjectId(topicId) : null;
    const directQuery = topicObjectId
      ? { $or: [{ topic: topicId as any }, { topic: topicObjectId as any }] }
      : { topic: topicId as any };

    const directLessons = await this.lessonModel
      .find(directQuery)
      .populate('exercises')
      .populate('quiz')
      .exec();

    // Merge any lessons found directly into the list if not already present
    const existingIds = new Set(lessonsList.map((l: any) => l._id?.toString()));
    for (const dl of directLessons) {
      if (dl && dl._id && !existingIds.has(dl._id.toString())) {
        lessonsList.push(dl);
        existingIds.add(dl._id.toString());
      }
    }

    return lessonsList;
  }

  async createLesson(topicId: string, data: any): Promise<Lesson> {
    const topic = await this.findTopicById(topicId);
    const subjectId = (topic.subject as any)?._id || topic.subject;
    const subjects = data.subjects && Array.isArray(data.subjects) && data.subjects.length > 0
      ? data.subjects
      : subjectId
      ? [subjectId]
      : [];
    const lesson = new this.lessonModel({
      ...data,
      topic: topicId,
      subjects,
      classes: data.classes || [],
    });
    const savedLesson = await lesson.save();

    // Auto-link lesson to topic
    topic.lessons.push(savedLesson._id as any);
    await (topic as any).save();

    return savedLesson;
  }

  async createStandaloneLesson(data: any): Promise<Lesson> {
    let topicId = data.topicId || data.topic;
    // If a topic wasn't explicitly supplied, check if subjectId was supplied
    if (!topicId && data.subjectId) {
      const subject = await this.subjectModel.findById(data.subjectId).populate('topics').exec();
      if (subject && subject.topics && subject.topics.length > 0) {
        topicId = (subject.topics[0] as any)._id;
      } else if (subject) {
        // Automatically create a default general topic under the subject
        const topic = new this.topicModel({
          title: 'General Curriculum Lessons',
          subject: subject._id,
        });
        const savedTopic = await topic.save();
        subject.topics.push(savedTopic._id as any);
        await (subject as any).save();
        topicId = savedTopic._id;
      }
    }

    const subjects = data.subjects && Array.isArray(data.subjects)
      ? data.subjects
      : data.subjectId
      ? [data.subjectId]
      : [];

    const exercises = Array.isArray(data.exercises) ? data.exercises.filter(Boolean) : [];
    const quiz = data.quiz || (exercises.length > 0 ? exercises[0] : undefined);

    const lesson = new this.lessonModel({
      ...data,
      topic: topicId || undefined,
      subjects,
      classes: data.classes || [],
      exercises,
      quiz,
    });
    const savedLesson = await lesson.save();

    if (topicId) {
      await this.topicModel.findByIdAndUpdate(topicId, {
        $addToSet: { lessons: savedLesson._id },
      });
    }

    return savedLesson;
  }

  async updateTopic(id: string, data: any): Promise<Topic> {
    const topic = await this.topicModel.findByIdAndUpdate(id, data, { new: true }).exec();
    if (!topic) throw new NotFoundException('Topic not found');
    return topic;
  }

  async deleteTopic(id: string): Promise<void> {
    const topic = await this.topicModel.findByIdAndDelete(id).exec();
    if (!topic) throw new NotFoundException('Topic not found');
  }

  async findAllLessons(query?: { classLevel?: string; subjectId?: string }): Promise<Lesson[]> {
    const filter: any = {};
    if (query?.classLevel && query.classLevel.trim()) {
      const trimmed = query.classLevel.trim();
      const regex = new RegExp(`^${trimmed}$`, 'i');
      filter.classes = { $in: [trimmed, regex] };
    }
    if (query?.subjectId && query.subjectId.trim()) {
      filter.subjects = query.subjectId.trim();
    }
    return this.lessonModel.find(filter)
      .populate('subjects')
      .populate('quiz')
      .populate('exercises')
      .populate({
        path: 'topic',
        populate: { path: 'subject' },
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findLessonById(id: string): Promise<Lesson> {
    const lesson = await this.lessonModel.findById(id)
      .populate('subjects')
      .populate('quiz')
      .populate('exercises')
      .populate({
        path: 'topic',
        populate: { path: 'subject' },
      })
      .exec();
    if (!lesson) throw new NotFoundException('Lesson not found');
    return lesson;
  }

  async updateLesson(id: string, data: any): Promise<Lesson> {
    const updateData: any = { ...data };
    if (Array.isArray(data.classes)) {
      updateData.classes = data.classes.filter(Boolean);
    }
    if (Array.isArray(data.subjects)) {
      updateData.subjects = data.subjects.filter(Boolean);
    }
    if (Array.isArray(data.exercises)) {
      updateData.exercises = data.exercises.filter(Boolean);
      // If quiz is not explicitly set, default to first exercise in the list
      if (!updateData.quiz && updateData.exercises.length > 0) {
        updateData.quiz = updateData.exercises[0];
      }
    }
    const lesson = await this.lessonModel.findByIdAndUpdate(id, updateData, { new: true })
      .populate('subjects')
      .populate('quiz')
      .populate('exercises')
      .populate({
        path: 'topic',
        populate: { path: 'subject' },
      })
      .exec();
    if (!lesson) throw new NotFoundException('Lesson not found');
    return lesson;
  }

  async deleteLesson(id: string): Promise<void> {
    const lesson = await this.lessonModel.findByIdAndDelete(id).exec();
    if (!lesson) throw new NotFoundException('Lesson not found');
  }
}
