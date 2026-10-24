import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    register: jest.fn(dto => {
      return { access_token: 'testToken', user: { email: dto.email } };
    }),
    login: jest.fn(dto => {
      return { access_token: 'testToken', user: { email: dto.email } };
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should register a user', async () => {
    const dto = { firstName: 'Test', lastName: 'User', email: 'test@test.com', password: 'password123' };
    expect(await controller.register(dto)).toEqual({
      access_token: 'testToken',
      user: { email: 'test@test.com' }
    });
    expect(mockAuthService.register).toHaveBeenCalledWith(dto);
  });

  it('should login a user', async () => {
    const dto = { email: 'test@test.com', password: 'password123' };
    expect(await controller.login(dto)).toEqual({
      access_token: 'testToken',
      user: { email: 'test@test.com' }
    });
    expect(mockAuthService.login).toHaveBeenCalledWith(dto);
  });
});
