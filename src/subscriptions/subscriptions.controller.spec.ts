import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';

describe('SubscriptionsController', () => {
  let controller: SubscriptionsController;

  const mockSubscriptionsService = {
    createPackage: jest.fn(data => ({ _id: '1', ...data })),
    findAllPackages: jest.fn(() => []),
    getUserActiveSubscription: jest.fn(id => ({ _id: 'sub1', isActive: true })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubscriptionsController],
      providers: [
        {
          provide: SubscriptionsService,
          useValue: mockSubscriptionsService,
        },
      ],
    }).compile();

    controller = module.get<SubscriptionsController>(SubscriptionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create a package', async () => {
    expect(await controller.createPackage({ name: 'Pkg' })).toEqual({ _id: '1', name: 'Pkg' });
  });

  it('should return user active subscription', async () => {
    expect(await controller.getMyActiveSubscription({ user: { id: 'u1' } })).toEqual({ _id: 'sub1', isActive: true });
  });
});
