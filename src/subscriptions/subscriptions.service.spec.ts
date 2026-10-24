import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionPackage } from './schemas/subscription-package.schema';
import { UserSubscription } from './schemas/user-subscription.schema';
import { User } from '../users/schemas/user.schema';
import { MailService } from '../mail/mail.service';
import { ConflictException } from '@nestjs/common';

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;

  class MockPackage {
    constructor(data: any) { Object.assign(this, data); }
    save = jest.fn().mockImplementation(async () => ({ _id: 'pkg1', ...this }));
  }

  class MockUserSubscription {
    constructor(data: any) { Object.assign(this, data); }
    save = jest.fn().mockImplementation(async () => ({ _id: 'sub1', ...this }));
  }

  const mockPackageModel = {
    findById: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({ _id: 'pkg1', name: 'JSS 1 Learning Package', academicSession: '2026/2027', price: 25000 }) }),
    find: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
    insertMany: jest.fn().mockResolvedValue([]),
  };

  const mockUserSubscriptionModel = {
    findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    find: jest.fn().mockReturnValue({ populate: jest.fn().mockReturnValue({ populate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }) }) }),
  };

  const mockUserModel = {
    findById: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        _id: 'user1',
        email: 'student@example.com',
        firstName: 'Student',
        save: jest.fn().mockResolvedValue(true),
      }),
    }),
  };

  const mockMailService = {
    sendSubscriptionReceiptEmail: jest.fn().mockResolvedValue(true),
    sendSubscriptionReminderEmail: jest.fn().mockResolvedValue(true),
    sendSubscriptionGraceNoticeEmail: jest.fn().mockResolvedValue(true),
    sendSubscriptionExpiredEmail: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        { provide: getModelToken(SubscriptionPackage.name), useValue: mockPackageModel },
        { provide: getModelToken(UserSubscription.name), useValue: mockUserSubscriptionModel },
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);

    (service as any).packageModel = Object.assign(function(data: any) { return new MockPackage(data); }, mockPackageModel);
    (service as any).userSubscriptionModel = Object.assign(function(data: any) { return new MockUserSubscription(data); }, mockUserSubscriptionModel);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('activateSubscription', () => {
    it('should activate subscription successfully with 1-year expiry, 7-day grace, and bind to student class', async () => {
      const result: any = await service.activateSubscription('user1', 'pkg1', 'ref123', 25000, 'monnify');
      expect(result.amountPaid).toBe(25000);
      expect(result.isActive).toBe(true);
      expect(result.status).toBe('active');
      expect(result.classLevel).toBe('JSS 1');

      // Verify expiration is 365 days and grace is 372 days
      const daysDiff = (new Date(result.expiresAt).getTime() - new Date(result.startDate).getTime()) / (24 * 3600 * 1000);
      expect(Math.round(daysDiff)).toBe(365);

      const graceDiff = (new Date(result.graceExpiresAt).getTime() - new Date(result.expiresAt).getTime()) / (24 * 3600 * 1000);
      expect(Math.round(graceDiff)).toBe(7);

      expect(mockMailService.sendSubscriptionReceiptEmail).toHaveBeenCalled();
    });

    it('should throw ConflictException if reference exists', async () => {
      mockUserSubscriptionModel.findOne.mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(true) });
      await expect(service.activateSubscription('user1', 'pkg1', 'ref123', 25000)).rejects.toThrow(ConflictException);
    });
  });

  describe('checkLessonAccess (Free Trial vs Subscription Gate)', () => {
    it('should allow student complimentary access to their first topic lessons & quiz (Free Trial)', async () => {
      // No active subscription, no attended topics yet
      mockUserSubscriptionModel.findOne.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(null),
          }),
        }),
      });
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: 'user1',
          attendedTopics: [],
          freeTrialUsed: false,
        }),
      });

      const access = await service.checkLessonAccess('user1', 'topic_first_1');
      expect(access.canAccess).toBe(true);
      expect(access.isFreeTrial).toBe(true);
    });

    it('should block access to a second topic when student has no active subscription', async () => {
      // No active subscription, student attended first topic
      mockUserSubscriptionModel.findOne.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(null),
          }),
        }),
      });
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: 'user1',
          attendedTopics: ['topic_first_1'],
          freeTrialUsed: true,
        }),
      });

      const access = await service.checkLessonAccess('user1', 'topic_second_2');
      expect(access.canAccess).toBe(false);
      expect(access.reason).toBe('subscription_required');
    });

    it('should allow access when student has active 1-year subscription', async () => {
      const now = new Date();
      mockUserSubscriptionModel.findOne.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue({
              _id: 'sub1',
              status: 'active',
              isActive: true,
              expiresAt: new Date(now.getTime() + 300 * 24 * 3600 * 1000),
              graceExpiresAt: new Date(now.getTime() + 307 * 24 * 3600 * 1000),
              save: jest.fn(),
            }),
          }),
        }),
      });

      const access = await service.checkLessonAccess('user1', 'topic_second_2');
      expect(access.canAccess).toBe(true);
      expect(access.hasSubscription).toBe(true);
      expect(access.isGracePeriod).toBe(false);
    });

    it('should allow access during 7-day grace mode', async () => {
      const now = new Date();
      const mockSub = {
        _id: 'sub1',
        status: 'active',
        isActive: true,
        expiresAt: new Date(now.getTime() - 2 * 24 * 3600 * 1000), // expired 2 days ago
        graceExpiresAt: new Date(now.getTime() + 5 * 24 * 3600 * 1000), // 5 days grace remaining
        graceNoticeSent: false,
        save: jest.fn(),
      };
      mockUserSubscriptionModel.findOne.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockSub),
          }),
        }),
      });
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: 'user1', email: 'student@example.com' }),
      });

      const access = await service.checkLessonAccess('user1', 'topic_second_2');
      expect(access.canAccess).toBe(true);
      expect(access.isGracePeriod).toBe(true);
      expect(mockMailService.sendSubscriptionGraceNoticeEmail).toHaveBeenCalled();
    });
  });
});
