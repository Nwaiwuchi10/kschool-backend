import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;

  const mockUsersService = {
    create: jest.fn(dto => {
      return { id: 'someId', ...dto };
    }),
    findAll: jest.fn(() => []),
    findOne: jest.fn(id => {
      return { id, firstName: 'Test', lastName: 'User', email: 'test@example.com' };
    }),
    update: jest.fn((id, dto) => {
      return { id, ...dto };
    }),
    remove: jest.fn(id => {
      return { deleted: true };
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create a user', async () => {
    const dto = { firstName: 'Adewale', lastName: 'Johnson', email: 'test@test.com' };
    expect(await controller.create(dto)).toEqual({ id: 'someId', ...dto });
    expect(mockUsersService.create).toHaveBeenCalledWith(dto);
  });

  it('should find all users', async () => {
    expect(await controller.findAll()).toEqual([]);
  });

  it('should find one user by id', async () => {
    expect(await controller.findOne('testId')).toEqual({
      id: 'testId',
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com'
    });
  });

  it('should update a user', async () => {
    const dto = { firstName: 'Updated' };
    expect(await controller.update('testId', dto)).toEqual({ id: 'testId', ...dto });
  });

  it('should delete a user', async () => {
    expect(await controller.remove('testId')).toEqual({ deleted: true });
  });
});
