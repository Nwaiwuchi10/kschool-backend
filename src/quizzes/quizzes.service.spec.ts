import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { QuizzesService } from './quizzes.service';
import { Quiz } from './schemas/quiz.schema';
import { QuizResult } from './schemas/quiz-result.schema';

describe('QuizzesService', () => {
  let service: QuizzesService;

  class MockQuiz {
    constructor(data: any) { Object.assign(this, data); }
    save = jest.fn().mockImplementation(async () => ({ _id: '1', ...this }));
  }

  class MockResult {
    constructor(data: any) { Object.assign(this, data); }
    save = jest.fn().mockImplementation(async () => ({ _id: '2', ...this }));
  }

  const mockQuizModel = {
    findById: jest.fn(),
    find: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
  };

  const mockResultModel = {
    find: jest.fn().mockReturnValue({ populate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }) }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuizzesService,
        { provide: getModelToken(Quiz.name), useValue: mockQuizModel },
        { provide: getModelToken(QuizResult.name), useValue: mockResultModel },
      ],
    }).compile();

    service = module.get<QuizzesService>(QuizzesService);
    
    (service as any).quizModel = Object.assign(function(data: any) { return new MockQuiz(data); }, mockQuizModel);
    (service as any).resultModel = Object.assign(function(data: any) { return new MockResult(data); }, mockResultModel);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('submitQuiz', () => {
    it('should evaluate math arithmetic answers and calculate passing grade (>= 70%)', async () => {
      mockQuizModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: 'quiz_math_1',
          title: 'Number Bases Knowledge Assessment',
          topic: 'topic_math_bases',
          questions: [
            {
              questionText: 'What is the value of binary 1101₂ converted to base 10?',
              options: ['11', '13', '15', '9'],
              correctOptionIndex: 1,
            },
            {
              questionText: 'Calculate: 10₂ + 11₂',
              options: ['100₂', '101₂', '110₂', '111₂'],
              correctOptionIndex: 1,
            },
          ],
        }),
      });

      const submission = await service.submitQuiz('user_student_123', 'quiz_math_1', [1, 1]); // 2/2 = 100%
      expect(submission.score).toBe(2);
      expect(submission.totalQuestions).toBe(2);
      expect(submission.passed).toBe(true);
    });

    it('should fail quiz if score is below 70%', async () => {
      mockQuizModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: 'quiz_math_1',
          questions: [
            { questionText: 'Q1', correctOptionIndex: 1 },
            { questionText: 'Q2', correctOptionIndex: 1 },
          ],
        }),
      });

      const submission = await service.submitQuiz('user_student_123', 'quiz_math_1', [0, 0]); // 0/2 = 0%
      expect(submission.score).toBe(0);
      expect(submission.totalQuestions).toBe(2);
      expect(submission.passed).toBe(false);
    });
  });

  describe('findQuizzesByTopic', () => {
    it('should retrieve quizzes for a given topic', async () => {
      const mockQuizzes = [{ _id: 'q1', title: 'Number Bases Quiz', topic: 'topic123' }];
      mockQuizModel.find.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(mockQuizzes),
      });

      const result = await service.findQuizzesByTopic('topic123');
      expect(result).toEqual(mockQuizzes);
    });
  });
});
