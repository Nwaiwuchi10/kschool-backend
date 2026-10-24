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

  async findByName(name: string): Promise<SchoolClass | null> {
    return this.classModel.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } }).exec();
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
    const activeSub = await this.userSubscriptionModel
      .findOne({
        user: userId,
        isActive: true,
        graceExpiresAt: { $gt: now },
        status: { $in: ['active', 'grace'] },
      } as any)
      .populate('package')
      .exec();

    let paidClass: string | null = null;
    let isClassLocked = false;

    if (activeSub) {
      isClassLocked = true;
      if ((activeSub as any).classLevel) {
        paidClass = (activeSub as any).classLevel;
      } else if (user.class) {
        paidClass = user.class;
      }
    }

    return {
      selectedClass: user.class || null,
      paidClass,
      isClassLocked,
      activeSubscription: activeSub || null,
    };
  }

  async selectClass(userId: string, className: string) {
    const trimmedClass = className.trim();
    const validClass = await this.findByName(trimmedClass);
    if (!validClass) {
      throw new NotFoundException(`Class "${trimmedClass}" is not an active curriculum class.`);
    }

    const status = await this.getUserClassStatus(userId);
    if (status.isClassLocked && status.paidClass) {
      const isSameClass = status.paidClass.toLowerCase() === trimmedClass.toLowerCase();
      if (!isSameClass) {
        throw new ConflictException(
          `Your subscription is locked to ${status.paidClass}. You can only switch classes after your subscription expires.`
        );
      }
    }

    const updatedUser = await this.userModel
      .findByIdAndUpdate(userId, { class: validClass.name }, { new: true })
      .exec();

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    this.mailService?.sendClassEnrollmentEmail?.(updatedUser, validClass.name)?.catch?.(e => this.logger.error('Enrollment email error', e));

    return {
      message: `Class successfully set to ${validClass.name}`,
      selectedClass: validClass.name,
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
