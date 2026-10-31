import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SubscriptionPackage, SubscriptionPackageDocument } from './schemas/subscription-package.schema';
import { UserSubscription, UserSubscriptionDocument } from './schemas/user-subscription.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Topic, TopicDocument } from '../subjects/schemas/topic.schema';
import { Lesson, LessonDocument } from '../subjects/schemas/lesson.schema';
import { Subject, SubjectDocument } from '../subjects/schemas/subject.schema';
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
    @InjectModel(Topic.name)
    private topicModel: Model<TopicDocument>,
    @InjectModel(Lesson.name)
    private lessonModel: Model<LessonDocument>,
    @InjectModel(Subject.name)
    private subjectModel: Model<SubjectDocument>,
    private mailService: MailService,
  ) {}

  private normalizeClassName(cls?: string): string {
    if (!cls) return '';
    return cls
      .trim()
      .toUpperCase()
      .replace(/^SSS\s+/i, 'SS ')
      .replace(/\s+/g, ' ');
  }

  private doesSubscriptionMatchClass(sub: any, targetClass?: string): boolean {
    if (!targetClass || !targetClass.trim()) return true;
    const normTarget = this.normalizeClassName(targetClass);

    if (sub.classLevel) {
      return this.normalizeClassName(sub.classLevel) === normTarget;
    }

    const pkgName = typeof sub.package === 'object' ? sub.package?.name : '';
    if (pkgName) {
      const match = pkgName.match(/(Primary\s+[1-6]|JSS\s+[1-3]|SSS\s+[1-3]|SS\s+[1-3])/i);
      if (match) {
        return this.normalizeClassName(match[0]) === normTarget;
      }
    }

    return false;
  }

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
    if (id && id.match(/^[0-9a-fA-F]{24}$/)) {
      const pkg = await this.packageModel.findById(id).exec();
      if (pkg) return pkg;
    }
    throw new NotFoundException('Subscription package not found');
  }

  async findOrCreatePackageForClass(packageId?: string, _classLevel?: string): Promise<SubscriptionPackageDocument> {
    // 1. The subscription plan created by Admin is a general plan that works for all classes.
    // If a valid packageId is provided, always use that exact package.
    if (packageId && packageId.match(/^[0-9a-fA-F]{24}$/)) {
      const byId = await this.packageModel.findById(packageId).exec();
      if (byId) {
        return byId;
      }
    }

    // 2. Otherwise use the general subscription plan created by Admin
    const allPackages = await this.packageModel.find().sort({ createdAt: -1 }).exec();
    if (allPackages.length > 0) {
      return allPackages[0];
    }

    // 3. Fallback general subscription plan only if Admin has not created any plan in DB yet
    const fallback = new this.packageModel({
      name: 'Annual Learning Subscription Plan',
      academicSession: '2026/2027',
      price: 25000,
      features: [
        'Full access to all curriculum subjects for your selected class (1 Year)',
        'Interactive lessons, audio narration, and practice quizzes',
        'Progress tracking throughout the academic year',
        'New learning content as it is released',
      ],
    });
    return fallback.save();
  }

  async activateSubscription(
    userId: string,
    packageId: string,
    reference: string,
    amountPaid: number,
    paymentGateway: string = 'paystack',
    classLevel?: string,
  ): Promise<UserSubscription> {
    const existingRef = await this.userSubscriptionModel
      .findOne({ reference })
      .populate('package')
      .exec();
    if (existingRef) {
      return existingRef;
    }

    const user = await this.userModel.findById(userId).exec();
    const pkg = await this.findOrCreatePackageForClass(packageId, classLevel || user?.class);

    // Determine target class: explicit classLevel selected by student, or user's current class
    let targetClass = (classLevel || '').trim();
    if (!targetClass && user?.class) {
      targetClass = user.class.trim();
    }
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
      package: pkg._id,
      classLevel: targetClass,
      reference,
      paymentGateway,
      amountPaid: amountPaid || pkg.price || 25000,
      startDate,
      expiresAt,
      graceExpiresAt,
      status: 'active',
      isActive: true,
      reminderSent: false,
      graceNoticeSent: false,
    });

    const saved = await subscription.save();

    // Update student's current active class to the newly subscribed class
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
          amount: amountPaid || pkg.price || 25000,
          reference,
          expiresAt,
        });
      }
    } catch (err) {
      this.logger.error('Failed to send subscription receipt email:', err);
    }

    return (await this.userSubscriptionModel.findById(saved._id).populate('package').exec()) || saved;
  }

  async getUserActiveSubscriptions(userId: string): Promise<UserSubscription[]> {
    const subs: any[] = await this.userSubscriptionModel
      .find({ user: userId as any })
      .sort({ createdAt: -1 })
      .populate('package')
      .exec();

    if (!subs || subs.length === 0) return [];

    const now = new Date();
    const activeSubs: UserSubscription[] = [];

    for (const sub of subs) {
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
        continue;
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
        activeSubs.push(sub as UserSubscription);
        continue;
      }

      if (sub.status === 'active' || sub.status === 'grace') {
        activeSubs.push(sub as UserSubscription);
      }
    }

    return activeSubs;
  }

  async getUserActiveSubscription(userId: string, classLevel?: string): Promise<UserSubscription | null> {
    const activeSubs = await this.getUserActiveSubscriptions(userId);
    if (activeSubs.length === 0) return null;

    const user = await this.userModel.findById(userId).exec();
    const targetClass = (classLevel || user?.class || '').trim();

    if (targetClass) {
      const matchedForClass = activeSubs.find((sub) =>
        this.doesSubscriptionMatchClass(sub, targetClass),
      );
      if (matchedForClass) {
        return matchedForClass;
      }
      // If a specific class exists on the user or query, subscription must match that class
      return null;
    }

    return activeSubs[0] || null;
  }

  async getUserSubscriptionHistory(userId: string): Promise<UserSubscription[]> {
    return this.userSubscriptionModel
      .find({ user: userId as any })
      .sort({ createdAt: -1 })
      .populate('package')
      .exec();
  }

  /**
   * Enforce lesson & quiz access rules:
   * A new user is entitled to one complimentary lesson topic per subject (e.g. English Topic 1, Math Topic 1).
   * Within that first topic, the first lesson and attached practice exercises are unlocked.
   * On any attempt to access a second topic or subsequent lessons of any subject, an active or grace subscription is required.
   */
  async checkLessonAccess(
    userId: string,
    topicId?: string,
    lessonId?: string,
    classLevel?: string,
  ): Promise<{
    canAccess: boolean;
    hasSubscription: boolean;
    isGracePeriod: boolean;
    isFreeTrial: boolean;
    reason?: string;
    message?: string;
  }> {
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

    let topic: any = null;
    let subject: any = null;
    let targetClass = (classLevel || '').trim();

    if (topicId) {
      topic = await this.topicModel.findById(topicId).populate('lessons').exec();
      if (topic?.subject) {
        subject = await this.subjectModel.findById(topic.subject).populate('topics').exec();
        if (!targetClass && subject) {
          targetClass = subject.classLevel || (Array.isArray(subject.classes) ? subject.classes[0] : '') || '';
        }
      }
    }

    if (!targetClass) {
      targetClass = user.class || '';
    }

    const activeSub = await this.getUserActiveSubscription(userId, targetClass);
    if (activeSub) {
      return {
        canAccess: true,
        hasSubscription: true,
        isGracePeriod: activeSub.status === 'grace',
        isFreeTrial: false,
        message: activeSub.status === 'grace' ? '7-Day Grace Period Active' : 'Active Subscription',
      };
    }

    if (!topicId) {
      // General topic access inquiry without specific topic ID
      return {
        canAccess: true,
        hasSubscription: false,
        isGracePeriod: false,
        isFreeTrial: true,
        message: 'Complimentary access available for your first topic in each subject.',
      };
    }

    if (!topic) {
      return {
        canAccess: false,
        hasSubscription: false,
        isGracePeriod: false,
        isFreeTrial: false,
        reason: 'topic_not_found',
      };
    }

    // Determine if this is the first topic of this subject
    let isFirstTopicOfSubject = true;
    if (subject && Array.isArray(subject.topics) && subject.topics.length > 0) {
      const firstTopicId = ((subject.topics[0] as any)?._id || subject.topics[0]).toString();
      isFirstTopicOfSubject = firstTopicId === topicId.toString();
    }

    // If it is NOT the first topic of this subject, subscription is required
    if (!isFirstTopicOfSubject) {
      return {
        canAccess: false,
        hasSubscription: false,
        isGracePeriod: false,
        isFreeTrial: false,
        reason: 'subscription_required',
        message: 'You have completed your complimentary topic for this subject. Subscribe to unlock all topics, lessons, and practice quizzes.',
      };
    }

    // If accessing a specific lesson inside the complimentary first topic:
    // The first lesson (and its quiz exercises) is complimentary.
    if (lessonId && Array.isArray(topic.lessons) && topic.lessons.length > 0) {
      const firstLessonId = ((topic.lessons[0] as any)?._id || topic.lessons[0]).toString();
      const isFirstLesson = firstLessonId === lessonId.toString();

      if (!isFirstLesson) {
        return {
          canAccess: false,
          hasSubscription: false,
          isGracePeriod: false,
          isFreeTrial: false,
          reason: 'subscription_required',
          message: 'This lesson is locked. Subscribe to unlock all lessons in this subject.',
        };
      }
    }

    // Access granted as complimentary first topic for this subject
    return {
      canAccess: true,
      hasSubscription: false,
      isGracePeriod: false,
      isFreeTrial: true,
      message: 'Complimentary access for your first lesson topic in this subject.',
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
        paymentGateway: sub.paymentGateway || 'paystack',
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
