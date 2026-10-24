import { Injectable, NotFoundException, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Subject, SubjectDocument } from './schemas/subject.schema';
import { Topic, TopicDocument } from './schemas/topic.schema';
import { Lesson, LessonDocument } from './schemas/lesson.schema';

export const DEFAULT_CURRICULUM_SUBJECTS = [
  // JSS 1 Subjects
  {
    name: 'Mathematics',
    classLevel: 'JSS 1',
    description: 'Foundational algebra, geometry, and numeracy for Junior Secondary School 1',
    topics: [
      { title: 'Algebra & Equations', lessons: ['Basic Algebraic Expressions', 'Linear Equations', 'Word Problems'] },
      { title: 'Geometry & Angles', lessons: ['Angles and Lines', 'Triangles & Polygons', 'Perimeter & Area'] },
      { title: 'Statistics & Data', lessons: ['Frequency Tables', 'Bar Charts and Pie Charts', 'Mean, Median & Mode'] },
    ],
  },
  {
    name: 'English Language',
    classLevel: 'JSS 1',
    description: 'Grammar, comprehension, vocabulary development, and essay writing',
    topics: [
      { title: 'Nouns', lessons: ['Common and Proper Nouns', 'Abstract and Collective Nouns', 'Plural Forms'] },
      { title: 'Pronouns', lessons: ['Personal Pronouns', 'Relative Pronouns', 'Reflexive Pronouns'] },
      { title: 'Verbs', lessons: ['Action Verbs & Helping Verbs', 'Transitive vs Intransitive', 'Verb Agreement'] },
      { title: 'Adjectives', lessons: ['Descriptive Adjectives', 'Degrees of Comparison', 'Order of Adjectives'] },
      { title: 'Adverbs', lessons: ['Adverbs of Manner', 'Adverbs of Time and Place', 'Adverbs of Frequency'] },
      { title: 'Tenses', lessons: ['Present Simple and Continuous', 'Past Simple', 'Future Forms'] },
    ],
  },
  {
    name: 'Basic Science',
    classLevel: 'JSS 1',
    description: 'Introduction to living things, energy, forces, and the environment',
    topics: [
      { title: 'Living & Non-Living Things', lessons: ['Characteristics of Living Things', 'Plant and Animal Cells'] },
      { title: 'Energy & Work', lessons: ['Forms of Energy', 'Conservation of Energy', 'Simple Machines'] },
      { title: 'The Human Body', lessons: ['Skeletal System', 'Digestive System', 'Circulatory System'] },
    ],
  },
  {
    name: 'Social Studies',
    classLevel: 'JSS 1',
    description: 'Citizenship, social institutions, family structures, and culture',
    topics: [
      { title: 'Family and Society', lessons: ['Functions of the Family', 'Social Roles and Responsibilities'] },
      { title: 'Culture and Values', lessons: ['Nigerian Cultural Heritage', 'National Symbols and Unity'] },
    ],
  },
  {
    name: 'Civic Education',
    classLevel: 'JSS 1',
    description: 'Democratic values, civic rights, duties, and constitutional principles',
    topics: [
      { title: 'Values & Morals', lessons: ['Honesty and Integrity', 'Discipline and Cooperation'] },
      { title: 'Citizenship & Rights', lessons: ['Rights of a Citizen', 'Responsibilities to the Nation'] },
    ],
  },
  {
    name: 'Computer Studies',
    classLevel: 'JSS 1',
    description: 'Digital literacy, computer components, software, and the internet',
    topics: [
      { title: 'Introduction to Computers', lessons: ['History of Computing', 'Hardware vs Software'] },
      { title: 'Information Technology', lessons: ['Data Processing', 'Internet Basics and Safety'] },
    ],
  },

  // SS 2 Subjects & Modules (matching screenshot: SS 2 - Science with Physics, Chemistry, Biology)
  {
    name: 'SS 2 - Science',
    classLevel: 'SS 2',
    description: 'Comprehensive senior secondary science curriculum spanning Physics, Chemistry, and Biology',
    topics: [
      { title: 'Physics', lessons: ['Mechanics & Motion', 'Wave Motion & Sound', 'Electric Fields & Current', 'Thermal Energy'] },
      { title: 'Chemistry', lessons: ['Periodic Table & Periodicity', 'Chemical Bonding', 'Acids, Bases & Salts', 'Stoichiometry'] },
      { title: 'Biology', lessons: ['Organization of Life', 'Cell Structure & Physiology', 'Genetics & Heredity', 'Ecology'] },
    ],
  },
  {
    name: 'JSS 1 - Science',
    classLevel: 'JSS 1',
    description: 'Integrated science program for Junior Secondary year 1',
    topics: [
      { title: 'Physical Science', lessons: ['Matter and Its States', 'Properties of Materials'] },
      { title: 'Biological Science', lessons: ['Plant Physiology', 'Human Health and Sanitation'] },
    ],
  },
  {
    name: 'JSS 1 - Mathematics',
    classLevel: 'JSS 1',
    description: 'Pure and applied mathematics fundamentals for JSS 1 students',
    topics: [
      { title: 'Number and Numeration', lessons: ['Fractions and Decimals', 'Percentages and Ratio'] },
      { title: 'Algebraic Processes', lessons: ['Simple Linear Equations', 'Factorization'] },
    ],
  },
  {
    name: 'Primary 5 - English',
    classLevel: 'Primary 5',
    description: 'Standard basic education English comprehension, vocabulary, and grammar',
    topics: [
      { title: 'Reading Comprehension', lessons: ['Passage Analysis', 'Context Clues and Vocabulary'] },
      { title: 'English Grammar', lessons: ['Parts of Speech', 'Punctuation and Sentence Building'] },
    ],
  },
];

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
    const lesson = new this.lessonModel({ ...data, topic: topicId });
    const savedLesson = await lesson.save();

    // Auto-link lesson to topic
    topic.lessons.push(savedLesson._id as any);
    await (topic as any).save();

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

  async findAllLessons(): Promise<Lesson[]> {
    return this.lessonModel.find().populate({
      path: 'topic',
      populate: { path: 'subject' },
    }).sort({ createdAt: -1 }).exec();
  }

  async findLessonById(id: string): Promise<Lesson> {
    const lesson = await this.lessonModel.findById(id).populate({
      path: 'topic',
      populate: { path: 'subject' },
    }).exec();
    if (!lesson) throw new NotFoundException('Lesson not found');
    return lesson;
  }

  async updateLesson(id: string, data: any): Promise<Lesson> {
    const lesson = await this.lessonModel.findByIdAndUpdate(id, data, { new: true }).exec();
    if (!lesson) throw new NotFoundException('Lesson not found');
    return lesson;
  }

  async deleteLesson(id: string): Promise<void> {
    const lesson = await this.lessonModel.findByIdAndDelete(id).exec();
    if (!lesson) throw new NotFoundException('Lesson not found');
  }
}
