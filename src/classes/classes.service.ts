import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SchoolClass, SchoolClassDocument } from './schemas/class.schema';
import { User, UserDocument, UserRole } from '../users/schemas/user.schema';
import { UserSubscription, UserSubscriptionDocument } from '../subscriptions/schemas/user-subscription.schema';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { MailService } from '../mail/mail.service';
import { Optional } from '@nestjs/common';

@Injectable()
export class ClassesService {
  private readonly logger = new Logger(ClassesService.name);

  constructor(
    @InjectModel(SchoolClass.name) private classModel: Model<SchoolClassDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(UserSubscription.name) private userSubscriptionModel: Model<UserSubscriptionDocument>,
    @Optional() private mailService?: MailService,
  ) {}

  async findAll(): Promise<SchoolClass[]> {
    return this.classModel.find({ isActive: true }).sort({ order: 1 }).exec();
  }

  async findAllAdmin(): Promise<SchoolClass[]> {
    return this.classModel.find().sort({ order: 1 }).exec();
  }

  async findOne(id: string): Promise<SchoolClass> {
    const schoolClass = await this.classModel.findById(id).exec();
    if (!schoolClass) {
      throw new NotFoundException(`Class with ID "${id}" not found`);
    }
    return schoolClass;
  }

  private normalizeClassName(cls?: string): string {
    if (!cls) return '';
    return cls
      .trim()
      .toUpperCase()
      .replace(/^SSS\s+/i, 'SS ')
      .replace(/\s+/g, ' ');
  }

  async findByName(name: string): Promise<SchoolClass | null> {
    const trimmed = name.trim();
    const direct = await this.classModel
      .findOne({ name: { $regex: new RegExp(`^${trimmed}$`, 'i') } })
      .exec();
    if (direct) return direct;

    // Also match SS 1 <-> SSS 1 variants
    const altName = trimmed.match(/^SSS\s+/i)
      ? trimmed.replace(/^SSS\s+/i, 'SS ')
      : trimmed.match(/^SS\s+/i)
      ? trimmed.replace(/^SS\s+/i, 'SSS ')
      : null;

    if (altName) {
      return this.classModel
        .findOne({ name: { $regex: new RegExp(`^${altName}$`, 'i') } })
        .exec();
    }

    return null;
  }

  async create(dto: CreateClassDto): Promise<SchoolClass> {
    const existing = await this.findByName(dto.name);
    if (existing) {
      throw new ConflictException(`Class "${dto.name}" already exists`);
    }
    const created = new this.classModel(dto);
    return created.save();
  }

  async update(id: string, dto: UpdateClassDto): Promise<SchoolClass> {
    const updated = await this.classModel.findByIdAndUpdate(id, dto, { new: true }).exec();
    if (!updated) {
      throw new NotFoundException(`Class with ID "${id}" not found`);
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    const res = await this.classModel.findByIdAndDelete(id).exec();
    if (!res) {
      throw new NotFoundException(`Class with ID "${id}" not found`);
    }
  }

  async getUserClassStatus(userId: string) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const now = new Date();
    const activeSubs = await this.userSubscriptionModel
      .find({
        user: userId,
        isActive: true,
        graceExpiresAt: { $gt: now },
        status: { $in: ['active', 'grace'] },
      } as any)
      .sort({ createdAt: -1 })
      .populate('package')
      .exec();

    const paidClassesSet = new Set<string>();
    for (const sub of activeSubs) {
      let cLevel = (sub as any).classLevel || '';
      if (!cLevel && typeof sub.package === 'object' && (sub.package as any)?.name) {
        const match = (sub.package as any).name.match(/(Primary\s+[1-6]|JSS\s+[1-3]|SSS\s+[1-3]|SS\s+[1-3])/i);
        if (match) cLevel = match[0];
      }
      if (cLevel) {
        paidClassesSet.add(cLevel.trim());
      }
    }

    const paidClasses = Array.from(paidClassesSet);
    const currentSelected = user.class || null;
    const normSelected = this.normalizeClassName(currentSelected || '');

    // Check if the currently selected class has an active subscription
    const matchingSub = activeSubs.find((sub: any) => {
      let cLevel = sub.classLevel || '';
      if (!cLevel && typeof sub.package === 'object' && sub.package?.name) {
        const match = sub.package.name.match(/(Primary\s+[1-6]|JSS\s+[1-3]|SSS\s+[1-3]|SS\s+[1-3])/i);
        if (match) cLevel = match[0];
      }
      return cLevel && this.normalizeClassName(cLevel) === normSelected;
    });

    const paidClass = matchingSub
      ? ((matchingSub as any).classLevel || currentSelected)
      : (paidClasses[0] || null);

    return {
      selectedClass: currentSelected,
      paidClass,
      paidClasses,
      isCurrentClassSubscribed: !!matchingSub,
      // Students can select and make payment for another class; each subscription is attached to its class
      isClassLocked: false,
      activeSubscription: matchingSub || null,
    };
  }

  async selectClass(userId: string, className: string) {
    const trimmedClass = className.trim();
    const validClass = await this.findByName(trimmedClass);
    const resolvedClassName = validClass ? validClass.name : trimmedClass;

    const updatedUser = await this.userModel
      .findByIdAndUpdate(userId, { class: resolvedClassName }, { new: true })
      .exec();

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    this.mailService?.sendClassEnrollmentEmail?.(updatedUser, resolvedClassName)?.catch?.(e => this.logger.error('Enrollment email error', e));

    return {
      message: `Class successfully set to ${resolvedClassName}`,
      selectedClass: resolvedClassName,
      user: {
        id: updatedUser._id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        class: updatedUser.class,
      },
    };
  }

  /**
   * Get class overview metrics and real enrolled students strictly from MongoDB
   */
  async getClassOverview(classIdentifier?: string) {
    let resolvedClass: SchoolClass | null = null;
    if (classIdentifier) {
      if (classIdentifier.match(/^[0-9a-fA-F]{24}$/)) {
        resolvedClass = await this.classModel.findById(classIdentifier).exec();
      }
      if (!resolvedClass) {
        resolvedClass = await this.findByName(classIdentifier);
      }
    }

    const className = resolvedClass ? resolvedClass.name : (classIdentifier || '');

    const query: any = { role: UserRole.STUDENT };
    if (className) {
      query.class = { $regex: new RegExp(`^${className.trim()}$`, 'i') };
    }

    const dbStudents = await this.userModel.find(query).select('-password').exec();

    const formattedDbStudents = dbStudents.map((u, idx) => ({
      id: String(u._id),
      name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Student ' + (idx + 1),
      rollNumber: `#${String(idx + 1).padStart(2, '0')}`,
      grade: u.class || className || '',
      className: u.class || className || '',
      score: 0,
      progress: u.completedLessons?.length ? Math.min(100, u.completedLessons.length * 10) : 0,
      currentTopic: u.attendedTopics?.length ? u.attendedTopics[u.attendedTopics.length - 1] : '',
      status: 'on_track' as const,
      avatar: (u as any).avatar || '',
      email: u.email,
    }));

    return {
      className: className || 'All Classes',
      classId: (resolvedClass as any)?._id || classIdentifier || '',
      totalStudents: formattedDbStudents.length,
      activeNow: 0,
      completedTopics: 0,
      avgQuizScore: 0,
      students: formattedDbStudents,
    };
  }

  /**
   * Get students for a class with optional search & filter strictly from MongoDB
   */
  async getClassStudents(classIdentifier?: string, search?: string, status?: string) {
    const overview = await this.getClassOverview(classIdentifier);
    let students = overview.students;

    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      students = students.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.currentTopic.toLowerCase().includes(q) ||
        s.rollNumber.toLowerCase().includes(q)
      );
    }

    if (status && status !== 'all') {
      const normalizedStatus = status.toLowerCase();
      students = students.filter(s => s.status === normalizedStatus);
    }

    return {
      className: overview.className,
      totalCount: students.length,
      students,
    };
  }

  /**
   * Get detailed profile, breakdown, quizzes, and insights for a specific student from MongoDB
   */
  async getStudentDetails(studentId: string) {
    if (studentId.match(/^[0-9a-fA-F]{24}$/)) {
      const user = await this.userModel.findById(studentId).select('-password').exec();
      if (user) {
        const studentName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
        return {
          id: String(user._id),
          name: studentName,
          rollNumber: '#01',
          grade: user.class || '',
          className: user.class || '',
          email: user.email,
          score: 0,
          progress: user.completedLessons?.length ? Math.min(100, user.completedLessons.length * 10) : 0,
          currentTopic: user.attendedTopics?.length ? user.attendedTopics[user.attendedTopics.length - 1] : '',
          status: 'on_track' as const,
          avatar: (user as any).avatar || '',
          milestoneSummary: '',
          stats: {
            subjectsCount: 0,
            completedCount: user.completedLessons?.length || 0,
            inProgressCount: user.attendedTopics?.length || 0,
            avgScore: 0,
          },
          subjectBreakdown: [],
          recentQuizzes: [],
          studyDuration: {
            totalHours: 0,
            weekly: [
              { day: 'M', hours: 0, active: false },
              { day: 'T', hours: 0, active: false },
              { day: 'W', hours: 0, active: false },
              { day: 'T', hours: 0, active: false },
              { day: 'F', hours: 0, active: false },
              { day: 'S', hours: 0, active: false },
              { day: 'S', hours: 0, active: false },
            ],
          },
          performanceInsights: {
            strongestSubject: { title: '', score: 0 },
            needsImprovement: { title: '', score: 0 },
            learningStreak: 0,
          },
        };
      }
    }

    throw new NotFoundException(`Student with ID "${studentId}" not found in database.`);
  }

  async encourageStudent(studentId: string, message?: string) {
    this.logger.log(`Encouragement dispatched for student ${studentId}: ${message || 'Keep up the good work!'}`);
    return {
      success: true,
      message: 'Encouragement sent to student successfully!',
    };
  }

  async assignPractice(studentId: string, payload?: any) {
    this.logger.log(`Practice assigned for student ${studentId}:`, payload);
    return {
      success: true,
      message: `Practice questions assigned to student successfully!`,
      assignment: payload,
    };
  }
}
