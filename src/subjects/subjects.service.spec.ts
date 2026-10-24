import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { SubjectsService } from './subjects.service';
import { Subject } from './schemas/subject.schema';
import { Topic } from './schemas/topic.schema';
import { Lesson } from './schemas/lesson.schema';
import { NotFoundException } from '@nestjs/common';

describe('SubjectsService', () => {
  let service: SubjectsService;

  class MockSubject {
    constructor(data: any) { Object.assign(this, data); }
    save = jest.fn().mockImplementation(async () => ({ _id: 'subject1', ...this }));
  }

  class MockTopic {
    constructor(data: any) { Object.assign(this, data); }
    save = jest.fn().mockImplementation(async () => ({ _id: 'topic1', ...this }));
  }

  class MockLesson {
    constructor(data: any) { Object.assign(this, data); }
    save = jest.fn().mockImplementation(async () => ({ _id: 'lesson1', ...this }));
  }

  const mockSubjectModel = {
    find: jest.fn().mockReturnValue({ populate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }) }),
    findById: jest.fn().mockReturnValue({ populate: jest.fn().mockReturnValue({ exec: jest.fn() }) }),
  };

  const mockTopicModel = {
    findById: jest.fn().mockReturnValue({ populate: jest.fn().mockReturnValue({ exec: jest.fn() }) }),
  };

  const mockLesson = {
    _id: 'lesson_math_1',
    title: 'Counting in Base Two (Binary Numbers)',
    content: '1101₂ = (1 × 2³) + (1 × 2²) + (0 × 2¹) + (1 × 2⁰) = 13₁₀\nBinary addition: 1 + 1 = 10₂',
    topic: 'topic_math_bases',
    duration: '12 mins',
    order: 2,
    status: 'published',
  };

  const mockLessonModel = {
    findById: jest.fn().mockImplementation(() => ({
      populate: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(mockLesson),
    })),
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockLesson]),
      }),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubjectsService,
        { provide: getModelToken(Subject.name), useValue: mockSubjectModel },
        { provide: getModelToken(Topic.name), useValue: mockTopicModel },
        { provide: getModelToken(Lesson.name), useValue: mockLessonModel },
      ],
    }).compile();

    service = module.get<SubjectsService>(SubjectsService);

    // Mocking constructors
    (service as any).subjectModel = Object.assign(function(data: any) { return new MockSubject(data); }, mockSubjectModel);
    (service as any).topicModel = Object.assign(function(data: any) { return new MockTopic(data); }, mockTopicModel);
    (service as any).lessonModel = Object.assign(function(data: any) { return new MockLesson(data); }, mockLessonModel);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllSubjects', () => {
    it('should retrieve subjects belonging to JSS 1 (Mathematics)', async () => {
      mockSubjectModel.find.mockReturnValueOnce({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([
            { _id: 'sub_math', name: 'Mathematics', classLevel: 'JSS 1' },
          ]),
        }),
      });

      const subjects = await service.findAllSubjects('JSS 1');
      expect(subjects.length).toBeGreaterThan(0);
      expect(subjects[0].name).toBe('Mathematics');
      expect(subjects[0].classLevel).toBe('JSS 1');
    });
  });

  describe('findSubjectById', () => {
    it('should throw NotFoundException if subject not found', async () => {
      mockSubjectModel.findById.mockReturnValueOnce({ populate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }) });
      await expect(service.findSubjectById('bad_id')).rejects.toThrow(NotFoundException);
    });

    it('should return a subject', async () => {
      const mockSubj = { _id: '1', name: 'Math' };
      mockSubjectModel.findById.mockReturnValueOnce({ populate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(mockSubj) }) });
      expect(await service.findSubjectById('1')).toEqual(mockSubj);
    });
  });

  describe('findLessonById', () => {
    it('should retrieve lesson with mathematical arithmetic and formulas', async () => {
      const lesson = await service.findLessonById('lesson_math_1');
      expect(lesson).toBeDefined();
      expect(lesson.content).toContain('1101₂');
      expect(lesson.content).toContain('Binary addition');
    });

    it('should throw NotFoundException if lesson not found', async () => {
      mockLessonModel.findById.mockImplementationOnce(() => ({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      }));

      await expect(service.findLessonById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findLessonsByTopic', () => {
    it('should retrieve lessons for a specific topic', async () => {
      mockTopicModel.findById.mockReturnValueOnce({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: 'topic_math_bases',
            title: 'Number Bases',
            lessons: [mockLesson],
          }),
        }),
      });

      const lessons = await service.findLessonsByTopic('topic_math_bases');
      expect(lessons.length).toBe(1);
      expect(lessons[0].title).toBe('Counting in Base Two (Binary Numbers)');
    });
  });

  describe('createTopic', () => {
    it('should create topic and link to subject', async () => {
      const mockSubj = { _id: 'subject1', name: 'Math', topics: [], save: jest.fn() };
      mockSubjectModel.findById.mockReturnValueOnce({ populate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(mockSubj) }) });
      
      const topic = await service.createTopic('subject1', { title: 'Algebra' });
      expect(topic.title).toBe('Algebra');
      expect(mockSubj.topics).toContain('topic1');
      expect(mockSubj.save).toHaveBeenCalled();
    });
  });

  describe('createLesson', () => {
    it('should create lesson and link to topic', async () => {
      const mockTopic = { _id: 'topic1', title: 'Algebra', lessons: [], save: jest.fn() };
      mockTopicModel.findById.mockReturnValueOnce({ populate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(mockTopic) }) });
      
      const lesson = await service.createLesson('topic1', { title: 'Intro' });
      expect(lesson.title).toBe('Intro');
      expect(mockTopic.lessons).toContain('lesson1');
      expect(mockTopic.save).toHaveBeenCalled();
    });
  });
});
