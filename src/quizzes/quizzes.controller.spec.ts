import { Test, TestingModule } from '@nestjs/testing';
import { QuizzesController } from './quizzes.controller';
import { QuizzesService } from './quizzes.service';

describe('QuizzesController', () => {
  let controller: QuizzesController;

  const mockQuizzesService = {
    createQuiz: jest.fn((id, data) => ({ _id: '1', topic: id, ...data })),
    findQuizById: jest.fn(id => ({ _id: id, title: 'Test Quiz' })),
    submitQuiz: jest.fn((userId, id, answers) => ({ _id: '2', score: 1, passed: true })),
    getUserResults: jest.fn(userId => []),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuizzesController],
      providers: [
        {
          provide: QuizzesService,
          useValue: mockQuizzesService,
        },
      ],
    }).compile();

    controller = module.get<QuizzesController>(QuizzesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('createQuiz', async () => {
    expect(await controller.createQuiz('topic1', { title: 'Q' })).toEqual({ _id: '1', topic: 'topic1', title: 'Q' });
  });

  it('submitQuiz', async () => {
    expect(await controller.submitQuiz({ user: { id: 'user1' } }, 'quiz1', [1])).toEqual({ _id: '2', score: 1, passed: true });
  });
});
