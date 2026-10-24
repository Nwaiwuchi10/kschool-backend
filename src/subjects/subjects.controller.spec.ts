import { Test, TestingModule } from '@nestjs/testing';
import { SubjectsController } from './subjects.controller';
import { SubjectsService } from './subjects.service';

describe('SubjectsController', () => {
  let controller: SubjectsController;

  const mockSubjectsService = {
    createSubject: jest.fn(data => ({ _id: '1', ...data })),
    findAllSubjects: jest.fn(() => []),
    findSubjectById: jest.fn(id => ({ _id: id, name: 'Test Subject' })),
    createTopic: jest.fn((id, data) => ({ _id: '2', subject: id, ...data })),
    findTopicById: jest.fn(id => ({ _id: id, title: 'Test Topic' })),
    createLesson: jest.fn((id, data) => ({ _id: '3', topic: id, ...data })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubjectsController],
      providers: [
        {
          provide: SubjectsService,
          useValue: mockSubjectsService,
        },
      ],
    }).compile();

    controller = module.get<SubjectsController>(SubjectsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('createSubject', async () => {
    expect(await controller.createSubject({ name: 'Math' })).toEqual({ _id: '1', name: 'Math' });
  });

  it('findAllSubjects', async () => {
    expect(await controller.findAllSubjects()).toEqual([]);
  });

  it('findSubjectById', async () => {
    expect(await controller.findSubjectById('1')).toEqual({ _id: '1', name: 'Test Subject' });
  });

  it('createTopic', async () => {
    expect(await controller.createTopic('1', { title: 'Topic' })).toEqual({ _id: '2', subject: '1', title: 'Topic' });
  });

  it('findTopicById', async () => {
    expect(await controller.findTopicById('2')).toEqual({ _id: '2', title: 'Test Topic' });
  });

  it('createLesson', async () => {
    expect(await controller.createLesson('2', { title: 'Lesson' })).toEqual({ _id: '3', topic: '2', title: 'Lesson' });
  });
});
