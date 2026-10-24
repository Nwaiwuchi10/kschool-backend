import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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
      populate: {
        path: 'lessons',
      },
    }).exec();
  }

  async findSubjectById(id: string): Promise<Subject> {
    const subject = await this.subjectModel.findById(id).populate({
      path: 'topics',
      populate: {
        path: 'lessons',
      },
    }).exec();
    if (!subject) throw new NotFoundException('Subject not found');
    return subject;
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
    const topic = await this.topicModel.findById(id).populate('lessons').exec();
    if (!topic) throw new NotFoundException('Topic not found');
    return topic;
  }

  async findLessonsByTopic(topicId: string): Promise<Lesson[]> {
    const topic = await this.topicModel.findById(topicId).populate('lessons').exec();
    if (!topic) throw new NotFoundException('Topic not found');
    return (topic.lessons as any) || [];
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

    const lesson = new this.lessonModel({
      ...data,
      topic: topicId || undefined,
      subjects,
      classes: data.classes || [],
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
    const lesson = await this.lessonModel.findByIdAndUpdate(id, updateData, { new: true })
      .populate('subjects')
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
