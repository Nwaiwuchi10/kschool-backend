import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SubscriptionPackage, SubscriptionPackageDocument } from './schemas/subscription-package.schema';
import { UserSubscription, UserSubscriptionDocument } from './schemas/user-subscription.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { MailService } from '../mail/mail.service';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectModel(SubscriptionPackage.name)
    private packageModel: Model<SubscriptionPackageDocument>,
    @InjectModel(UserSubscription.name)
    private userSubscriptionModel: Model<UserSubscriptionDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    private mailService: MailService,
  ) {}

  async createPackage(data: any): Promise<SubscriptionPackage> {
    const pkg = new this.packageModel(data);
    return pkg.save();
  }

  async findAllPackages(): Promise<SubscriptionPackage[]> {
    return this.packageModel.find().sort({ createdAt: -1 }).exec();
  }

  async updatePackage(id: string, data: any): Promise<SubscriptionPackage> {
    const pkg = await this.packageModel.findByIdAndUpdate(id, data, { new: true }).exec();
    if (!pkg) throw new NotFoundException('Subscription package not found');
    return pkg;
  }

  async deletePackage(id: string): Promise<void> {
    const pkg = await this.packageModel.findByIdAndDelete(id).exec();
    if (!pkg) throw new NotFoundException('Subscription package not found');
  }

  async findPackageById(id: string): Promise<SubscriptionPackage> {
    const pkg = await this.packageModel.findById(id).exec();
    if (!pkg) throw new NotFoundException('Subscription package not found');
    return pkg;
  }

  async activateSubscription(
    userId: string,
    packageId: string,
    reference: string,
    amountPaid: number,
    paymentGateway: string = 'monnify',
    classLevel?: string,
  ): Promise<UserSubscription> {
    const pkg = await this.findPackageById(packageId);

    const existingRef = await this.userSubscriptionModel.findOne({ reference }).exec();
    if (existingRef) {
      throw new ConflictException('Transaction reference already used');
    }

    const user = await this.userModel.findById(userId).exec();

    // Determine target class: explicit classLevel, or user's enrolled class, or extract from package name
    let targetClass = classLevel || user?.class || '';
    if (!targetClass && pkg?.name) {
      const match = pkg.name.match(/(Primary\s+[1-6]|JSS\s+[1-3]|SSS\s+[1-3]|SS\s+[1-3])/i);
      if (match) targetClass = match[0];
    }

    const startDate = new Date();
    // 1 Full year duration (365 days)
    const expiresAt = new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);
    // 7-day grace period added after 1 year expiry
    const graceExpiresAt = new Date(expiresAt.getTime() + 7 * 24 * 60 * 60 * 1000);

    const subscription = new this.userSubscriptionModel({
      user: userId,
      package: packageId,
      classLevel: targetClass,
      reference,
      paymentGateway,
      amountPaid,
      startDate,
      expiresAt,
      graceExpiresAt,
      status: 'active',
      isActive: true,
      reminderSent: false,
      graceNoticeSent: false,
    });

    const saved = await subscription.save();

    // Ensure student's enrolled class is strictly bound to this subscription's class
    if (user && targetClass && user.class !== targetClass) {
      user.class = targetClass;
      if (typeof user.save === 'function') {
        await user.save();
      }
    }

    // Fetch user details and send confirmation receipt email
    try {
      if (user && user.email) {
        await this.mailService.sendSubscriptionReceiptEmail(user, {
          packageName: pkg.name,
          academicSession: pkg.academicSession,
          amount: amountPaid,
          reference,
          expiresAt,
        });
      }
    } catch (err) {
      this.logger.error('Failed to send subscription receipt email:', err);
    }

    return saved;
  }

  async getUserActiveSubscription(userId: string): Promise<UserSubscription | null> {
    const sub: any = await this.userSubscriptionModel
      .findOne({ user: userId as any })
      .sort({ createdAt: -1 })
      .populate('package')
      .exec();

    if (!sub) return null;

    const now = new Date();

    // Past 7-day grace period -> Expired
    if (now > sub.graceExpiresAt) {
      if (sub.status !== 'expired') {
        sub.status = 'expired';
        sub.isActive = false;
        await sub.save();

        const user = await this.userModel.findById(userId).exec();
        if (user && user.email) {
          await this.mailService.sendSubscriptionExpiredEmail(user, {
            packageName: (sub.package as any)?.name || 'Annual Package',
          });
        }
      }
      return null;
    }

    // Past 1-year expiration date, but within 7 days -> Grace period
    if (now > sub.expiresAt) {
      if (sub.status !== 'grace') {
        sub.status = 'grace';
        sub.isActive = true;
        await sub.save();

        if (!sub.graceNoticeSent) {
          sub.graceNoticeSent = true;
          await sub.save();
          const user = await this.userModel.findById(userId).exec();
          if (user && user.email) {
            const daysLeft = Math.ceil(
              (sub.graceExpiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
            );
            await this.mailService.sendSubscriptionGraceNoticeEmail(user, {
              packageName: (sub.package as any)?.name || 'Annual Package',
              graceExpiryDate: sub.graceExpiresAt,
              graceDaysLeft: Math.max(1, daysLeft),
            });
          }
        }
      }
      return sub as UserSubscription;
    }

    // Active
    if (sub.status === 'active') {
      return sub as UserSubscription;
    }

    return null;
  }

  /**
   * Enforce lesson & quiz access rules:
   * First topic is 100% free (free trial).
   * For subsequent topics, an active or grace subscription is strictly required.
   */
  async checkLessonAccess(
    userId: string,
    topicId?: string,
    lessonId?: string,
  ): Promise<{
    canAccess: boolean;
    hasSubscription: boolean;
    isGracePeriod: boolean;
    isFreeTrial: boolean;
    reason?: string;
    message?: string;
  }> {
    const activeSub = await this.getUserActiveSubscription(userId);
    if (activeSub) {
      return {
        canAccess: true,
        hasSubscription: true,
        isGracePeriod: activeSub.status === 'grace',
        isFreeTrial: false,
        message: activeSub.status === 'grace' ? '7-Day Grace Period Active' : 'Active Subscription',
      };
    }

    // Check user free trial status
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      return {
        canAccess: false,
        hasSubscription: false,
        isGracePeriod: false,
        isFreeTrial: false,
        reason: 'user_not_found',
      };
    }

    const attendedTopics = user.attendedTopics || [];

    // If user hasn't started any topic yet, this is their first topic -> FREE
    if (attendedTopics.length === 0) {
      return {
        canAccess: true,
        hasSubscription: false,
        isGracePeriod: false,
        isFreeTrial: true,
        message: 'Complimentary access for your first topic lessons and quiz.',
      };
    }

    // If this lesson belongs to the first attended topic -> still FREE
    if (topicId && (attendedTopics[0] === topicId || attendedTopics.includes(topicId))) {
      return {
        canAccess: true,
        hasSubscription: false,
        isGracePeriod: false,
        isFreeTrial: true,
        message: 'Complimentary access for your first topic.',
      };
    }

    // Otherwise, second topic / second attempt requires annual subscription
    return {
      canAccess: false,
      hasSubscription: false,
      isGracePeriod: false,
      isFreeTrial: false,
      reason: 'subscription_required',
      message:
        'You have completed your complimentary first topic! Please subscribe to unlock all lessons, subjects, and quizzes.',
    };
  }

  /**
   * Track student lesson/topic completion
   */
  async recordLessonProgress(
    userId: string,
    topicId: string,
    lessonId: string,
    isQuizFinished: boolean = false,
  ) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) return;

    if (!user.attendedTopics) user.attendedTopics = [];
    if (!user.completedLessons) user.completedLessons = [];

    if (topicId && !user.attendedTopics.includes(topicId)) {
      user.attendedTopics.push(topicId);
    }
    if (lessonId && !user.completedLessons.includes(lessonId)) {
      user.completedLessons.push(lessonId);
    }
    if (isQuizFinished) {
      user.freeTrialUsed = true;
    }

    await user.save();
  }

  /**
   * Automated cron/task: 2-week reminders and grace period expiration handler
   */
  async processSubscriptionReminders() {
    const now = new Date();
    const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    // 1. Subscriptions expiring in <= 14 days where reminderSent is false
    const expiringSoon = await this.userSubscriptionModel
      .find({
        status: 'active',
        reminderSent: false,
        expiresAt: { $lte: twoWeeksFromNow, $gt: now },
      })
      .populate('user')
      .populate('package')
      .exec();

    for (const sub of expiringSoon) {
      try {
        const user = sub.user as any;
        if (user && user.email) {
          const daysLeft = Math.ceil(
            (sub.expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
          );
          await this.mailService.sendSubscriptionReminderEmail(user, {
            packageName: (sub.package as any)?.name || 'Annual Package',
            expiryDate: sub.expiresAt,
            daysLeft: Math.max(1, daysLeft),
          });
          sub.reminderSent = true;
          await sub.save();
        }
      } catch (err) {
        this.logger.error('Error sending renewal reminder:', err);
      }
    }

    // 2. Subscriptions past expiresAt that need grace mode
    const readyForGrace = await this.userSubscriptionModel
      .find({
        status: 'active',
        expiresAt: { $lte: now },
        graceExpiresAt: { $gt: now },
      })
      .populate('user')
      .populate('package')
      .exec();

    for (const sub of readyForGrace) {
      sub.status = 'grace';
      sub.graceNoticeSent = true;
      await sub.save();
      const user = sub.user as any;
      if (user && user.email) {
        const daysLeft = Math.ceil(
          (sub.graceExpiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
        );
        await this.mailService.sendSubscriptionGraceNoticeEmail(user, {
          packageName: (sub.package as any)?.name || 'Annual Package',
          graceExpiryDate: sub.graceExpiresAt,
          graceDaysLeft: Math.max(1, daysLeft),
        });
      }
    }

    // 3. Subscriptions past graceExpiresAt that need full expiration
    const readyForExpiry = await this.userSubscriptionModel
      .find({
        status: { $in: ['active', 'grace'] },
        graceExpiresAt: { $lte: now },
      })
      .populate('user')
      .populate('package')
      .exec();

    for (const sub of readyForExpiry) {
      sub.status = 'expired';
      sub.isActive = false;
      await sub.save();
      const user = sub.user as any;
      if (user && user.email) {
        await this.mailService.sendSubscriptionExpiredEmail(user, {
          packageName: (sub.package as any)?.name || 'Annual Package',
        });
      }
    }
  }

  // ==========================================
  // ADMIN FINANCES, EARNINGS & TRANSACTIONS
  // ==========================================
  async getAdminFinancesOverview(filter?: {
    startDate?: string;
    endDate?: string;
    classLevel?: string;
  }) {
    const query: any = {};

    if (filter?.startDate || filter?.endDate) {
      query.createdAt = {};
      if (filter.startDate) query.createdAt.$gte = new Date(filter.startDate);
      if (filter.endDate) {
        const end = new Date(filter.endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    if (filter?.classLevel && filter.classLevel !== 'All') {
      query.classLevel = { $regex: new RegExp(`^${filter.classLevel.trim()}$`, 'i') };
    }

    const subscriptions = await this.userSubscriptionModel
      .find(query)
      .populate('user', 'firstName lastName email phoneNumber class')
      .populate('package', 'name price academicSession')
      .sort({ createdAt: -1 })
      .exec();

    const now = new Date();
    let totalRevenue = 0;
    let activeSubscriptionsCount = 0;
    let graceSubscriptionsCount = 0;
    let expiredSubscriptionsCount = 0;

    const transactions = subscriptions.map((sub: any) => {
      const amount = sub.amountPaid || 0;
      totalRevenue += amount;

      const isExpired = new Date(sub.expiresAt) < now;
      const inGrace = isExpired && new Date(sub.graceExpiresAt) >= now;

      if (!isExpired && sub.status === 'active') activeSubscriptionsCount++;
      else if (inGrace) graceSubscriptionsCount++;
      else expiredSubscriptionsCount++;

      return {
        id: String(sub._id),
        reference: sub.reference,
        studentName: sub.user ? `${sub.user.firstName || ''} ${sub.user.lastName || ''}`.trim() : 'Unknown Student',
        studentEmail: sub.user?.email || '—',
        classLevel: sub.classLevel || sub.user?.class || '—',
        packageName: sub.package?.name || 'Annual Package',
        amount: amount,
        paymentGateway: sub.paymentGateway || 'monnify',
        status: inGrace ? 'grace' : isExpired ? 'expired' : sub.status,
        startDate: sub.startDate,
        expiresAt: sub.expiresAt,
        graceExpiresAt: sub.graceExpiresAt,
        createdAt: sub.createdAt,
      };
    });

    // Also get all distinct packages count
    const packagesCount = await this.packageModel.countDocuments();

    return {
      summary: {
        totalRevenue,
        totalTransactions: transactions.length,
        activeSubscriptionsCount,
        graceSubscriptionsCount,
        expiredSubscriptionsCount,
        packagesCount,
      },
      transactions,
    };
  }

  async getAdminSubscriptionsList(statusFilter?: string) {
    const query: any = {};
    if (statusFilter && statusFilter !== 'all') {
      query.status = statusFilter;
    }

    return this.userSubscriptionModel
      .find(query)
      .populate('user', 'firstName lastName email phoneNumber class')
      .populate('package', 'name price academicSession')
      .sort({ createdAt: -1 })
      .exec();
  }
}
