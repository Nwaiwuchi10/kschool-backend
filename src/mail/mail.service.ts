import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private mailerService: MailerService) {}

  private renderBaseTemplate(options: {
    title: string;
    subtitle?: string;
    content: string;
  }): string {
    const { title, subtitle, content } = options;
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAFAFA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1A1A1A;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FAFAFA; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 560px; background-color: #FFFFFF; border-radius: 20px; border: 1px solid #E5E7EB; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);">
          <!-- Header -->
          <tr>
            <td style="background-color: #127A71; padding: 28px 32px; text-align: left;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="width: 44px; height: 44px; background: rgba(255, 255, 255, 0.2); border-radius: 12px; text-align: center; vertical-align: middle; font-size: 22px;">
                    🎓
                  </td>
                  <td style="padding-left: 14px;">
                    <div style="font-size: 20px; font-weight: 800; color: #FFFFFF; letter-spacing: 0.5px;">KSCHOOLMATE</div>
                    <div style="font-size: 12px; color: #D1FAE5; font-weight: 500;">Your School in Your Pocket</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Content Header -->
          <tr>
            <td style="padding: 32px 32px 12px 32px;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #1A1A1A; line-height: 32px;">${title}</h1>
              ${subtitle ? `<p style="margin: 8px 0 0 0; font-size: 15px; color: #6B7280; line-height: 22px;">${subtitle}</p>` : ''}
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding: 12px 32px 32px 32px; font-size: 15px; color: #374151; line-height: 24px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #F9FAFB; padding: 24px 32px; border-top: 1px solid #F3F4F6; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #9CA3AF;">© ${new Date().getFullYear()} KSCHOOLMATE. All rights reserved.</p>
              <p style="margin: 6px 0 0 0; font-size: 12px; color: #9CA3AF;">
                Need help? Contact support at <a href="mailto:odysseyjnrboss@gmail.com" style="color: #127A71; text-decoration: none; font-weight: 600;">odysseyjnrboss@gmail.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  async sendWelcomeEmail(user: any) {
    try {
      const firstName = user.firstName || 'Student';
      const content = `
        <p style="margin: 0 0 16px 0;">Hello <strong>${firstName}</strong>,</p>
        <p style="margin: 0 0 20px 0;">
          ${user.role === 'admin' 
            ? 'Welcome to the <strong>KSCHOOLMATE Back Office Admin Team</strong>! Your administrator account has been set up with privileges to manage curriculum, classes, quizzes, users, and subscriptions.'
            : 'Welcome to <strong>KSCHOOLMATE</strong>! Your account has been created successfully. You now have instant access to curriculum-aligned lessons, notes, and quizzes designed to help you excel.'
          }
        </p>
        
        <div style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 14px; padding: 20px; margin: 24px 0;">
          <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 700; color: #127A71;">
            ${user.role === 'admin' ? 'Administrative Capabilities:' : 'What you can do right now:'}
          </h3>
          <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px; line-height: 22px;">
            ${user.role === 'admin'
              ? `
                <li style="margin-bottom: 8px;"><strong>Class Management</strong>: Configure and order school curriculum levels</li>
                <li style="margin-bottom: 8px;"><strong>Subject & Topics</strong>: Manage educational notes and multimedia</li>
                <li style="margin-bottom: 8px;"><strong>Subscriptions</strong>: Monitor paid packages and active student enrollments</li>
                <li><strong>Security & Access</strong>: Monitor user registrations and portal activity</li>
              `
              : `
                <li style="margin-bottom: 8px;"><strong>Choose your class</strong> and select your curriculum subjects</li>
                <li style="margin-bottom: 8px;"><strong>Study anytime</strong> with written notes and audio lessons</li>
                <li style="margin-bottom: 8px;"><strong>Test your knowledge</strong> with interactive practice quizzes</li>
                <li><strong>Track your learning progress</strong> week by week</li>
              `
            }
          </ul>
        </div>

        <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 28px 0 16px 0;">
          <tr>
            <td align="center" style="border-radius: 28px; background-color: #127A71;">
              <a href="${user.role === 'admin' ? 'http://localhost:3000' : (process.env.FRONTEND_URL || 'exp://localhost:8081')}" target="_blank" style="font-size: 15px; font-weight: 700; color: #FFFFFF; text-decoration: none; padding: 14px 32px; display: inline-block;">
                ${user.role === 'admin' ? 'Open Admin Portal →' : 'Start Learning Now →'}
              </a>
            </td>
          </tr>
        </table>

        <p style="margin: 24px 0 0 0; font-size: 13px; color: #6B7280;">
          If you have any questions, our technical team is always here to help!
        </p>
      `;

      await this.mailerService.sendMail({
        to: user.email,
        subject: 'Welcome to KSCHOOLMATE! 🎉',
        html: this.renderBaseTemplate({
          title: user.role === 'admin' ? 'Welcome to KSCHOOLMATE Admin Portal! 🛡️' : 'Welcome to KSCHOOLMATE! 🎉',
          subtitle: user.role === 'admin' ? 'Your administrative workspace is ready.' : 'Your personalized school companion is ready.',
          content,
        }),
      });
      this.logger.log(`Welcome email successfully sent to ${user.email}`);
    } catch (err) {
      this.logger.error(`Failed to send welcome email to ${user.email}`, err);
    }
  }

  async sendLoginNotificationEmail(user: any, meta?: { ip?: string; userAgent?: string; time?: Date }) {
    try {
      const firstName = user.firstName || (user.role === 'admin' ? 'Administrator' : 'Classmate');
      const loginTime = (meta?.time || new Date()).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
      const ip = meta?.ip || 'Verified Device';
      const userAgent = meta?.userAgent || (user.role === 'admin' ? 'KSCHOOLMATE Admin Portal' : 'KSCHOOLMATE Mobile App');

      const content = `
        <p style="margin: 0 0 16px 0;">Hi <strong>${firstName}</strong>,</p>
        <p style="margin: 0 0 20px 0;">
          We noticed a new login to your KSCHOOLMATE ${user.role === 'admin' ? 'Admin Portal' : 'account'}. Here are the details of this session:
        </p>

        <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 14px; padding: 18px 20px; margin: 20px 0;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #64748B; width: 110px;"><strong>Date & Time:</strong></td>
              <td style="padding: 6px 0; color: #0F172A; font-weight: 600;">${loginTime}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748B;"><strong>Account Email:</strong></td>
              <td style="padding: 6px 0; color: #0F172A; font-weight: 600;">${user.email}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748B;"><strong>Device / Client:</strong></td>
              <td style="padding: 6px 0; color: #0F172A; font-weight: 600;">${userAgent}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748B;"><strong>Network / IP:</strong></td>
              <td style="padding: 6px 0; color: #0F172A; font-weight: 600;">${ip}</td>
            </tr>
          </table>
        </div>

        <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 14px 16px; border-radius: 8px; margin: 24px 0;">
          <p style="margin: 0; font-size: 13px; color: #92400E; line-height: 20px;">
            <strong>Security Notice:</strong> If this was you, you can safely ignore this notification. If you didn't log in at this time, please reset your password immediately to protect your account.
          </p>
        </div>
      `;

      await this.mailerService.sendMail({
        to: user.email,
        subject: 'Security Alert: New Login to KSCHOOLMATE',
        html: this.renderBaseTemplate({
          title: 'Security Alert: New Account Login',
          subtitle: 'A new session was initiated on your account.',
          content,
        }),
      });
      this.logger.log(`Login notification email sent to ${user.email}`);
    } catch (err) {
      this.logger.error(`Failed to send login notification to ${user.email}`, err);
    }
  }

  async sendPasswordResetCodeEmail(user: any, code: string) {
    try {
      const firstName = user.firstName || 'Student';
      const content = `
        <p style="margin: 0 0 16px 0;">Hello <strong>${firstName}</strong>,</p>
        <p style="margin: 0 0 20px 0;">
          We received a request to reset your KSCHOOLMATE password. Please enter the following 4-digit verification code in your mobile app:
        </p>

        <!-- OTP Display Box -->
        <div style="text-align: center; margin: 32px 0;">
          <div style="display: inline-block; background-color: #ECFDF5; border: 2px dashed #127A71; border-radius: 16px; padding: 18px 36px;">
            <span style="font-size: 36px; font-weight: 900; letter-spacing: 12px; color: #127A71; font-family: monospace;">
              ${code}
            </span>
          </div>
        </div>

        <div style="background-color: #F8FAFC; border-radius: 12px; padding: 14px 18px; margin: 24px 0;">
          <p style="margin: 0; font-size: 13px; color: #64748B; line-height: 20px;">
            ⏳ <strong>Validity:</strong> This code is valid for <strong>15 minutes</strong>. For your security, never share this code with anyone.
          </p>
        </div>

        <p style="margin: 20px 0 0 0; font-size: 13px; color: #6B7280;">
          If you did not request a password reset, you can safely ignore this email. Your current password remains unchanged.
        </p>
      `;

      await this.mailerService.sendMail({
        to: user.email,
        subject: 'Your KSCHOOLMATE Password Reset Code',
        html: this.renderBaseTemplate({
          title: 'Password Reset Code',
          subtitle: 'Use this verification code to complete your password reset.',
          content,
        }),
      });
      this.logger.log(`Password reset code email sent to ${user.email}`);
    } catch (err) {
      this.logger.error(`Failed to send password reset code email to ${user.email}`, err);
    }
  }

  async sendPasswordChangedEmail(user: any) {
    try {
      const firstName = user.firstName || 'Student';
      const content = `
        <p style="margin: 0 0 16px 0;">Hi <strong>${firstName}</strong>,</p>
        <p style="margin: 0 0 20px 0;">
          Your <strong>KSCHOOLMATE</strong> account password has been updated successfully.
        </p>
        <div style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 12px; padding: 16px 18px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #166534; font-weight: 600;">
            ✓ Your password has been updated. You can now log in with your new credentials.
          </p>
        </div>
        <p style="margin: 20px 0 0 0; font-size: 13px; color: #6B7280;">
          If you did not make this change, please contact our support team immediately at <a href="mailto:odysseyjnrboss@gmail.com" style="color: #127A71;">odysseyjnrboss@gmail.com</a>.
        </p>
      `;

      await this.mailerService.sendMail({
        to: user.email,
        subject: 'Your KSCHOOLMATE Password Has Been Changed',
        html: this.renderBaseTemplate({
          title: 'Password Updated Successfully',
          subtitle: 'Your account security has been updated.',
          content,
        }),
      });
      this.logger.log(`Password change confirmation email sent to ${user.email}`);
    } catch (err) {
      this.logger.error(`Failed to send password changed email to ${user.email}`, err);
    }
  }

  async sendClassEnrollmentEmail(user: any, className: string) {
    try {
      const firstName = user.firstName || 'Student';
      const content = `
        <p style="margin: 0 0 16px 0;">Hello <strong>${firstName}</strong>,</p>
        <p style="margin: 0 0 20px 0;">
          Congratulations! You have successfully selected and enrolled into <strong>${className}</strong> on KSCHOOLMATE.
        </p>
        
        <div style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 14px; padding: 20px; margin: 24px 0;">
          <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 700; color: #127A71;">
            Curriculum Status:
          </h3>
          <p style="margin: 0; font-size: 14px; color: #374151;">
            Your curriculum, subjects, audio notes, and practice quizzes for <strong>${className}</strong> are now active in your mobile app.
          </p>
        </div>

        <p style="margin: 20px 0 0 0; font-size: 13px; color: #6B7280;">
          Need to change classes or have questions? Contact support at <a href="mailto:odysseyjnrboss@gmail.com" style="color: #127A71;">odysseyjnrboss@gmail.com</a>.
        </p>
      `;

      await this.mailerService.sendMail({
        to: user.email,
        subject: `Class Enrollment Confirmed: ${className} 📚`,
        html: this.renderBaseTemplate({
          title: `Enrolled in ${className}! 📚`,
          subtitle: `Your curriculum for ${className} is now active.`,
          content,
        }),
      });
      this.logger.log(`Class enrollment email sent to ${user.email} for ${className}`);
    } catch (err) {
      this.logger.error(`Failed to send class enrollment email to ${user.email}`, err);
    }
  }

  async sendPasswordResetEmail(user: any, token: string) {
    const url = `${process.env.FRONTEND_URL || 'exp://localhost:8081'}/reset-password?token=${token}`;
    await this.mailerService.sendMail({
      to: user.email,
      subject: 'Reset your KSCHOOLMATE password',
      html: this.renderBaseTemplate({
        title: 'Reset your KSCHOOLMATE password',
        subtitle: 'Click below to securely reset your password.',
        content: `
          <p style="margin: 0 0 16px 0;">Hello ${user.firstName || 'Student'},</p>
          <p style="margin: 0 0 20px 0;">Click the button below to reset your password:</p>
          <p style="margin: 24px 0;"><a href="${url}" style="background-color: #127A71; color: #FFFFFF; padding: 12px 24px; border-radius: 24px; text-decoration: none; font-weight: bold; display: inline-block;">Reset Password</a></p>
          <p style="margin: 20px 0 0 0; font-size: 13px; color: #6B7280;">If you did not request this, please ignore this email.</p>
        `,
      }),
    });
  }

  async sendSubscriptionReceiptEmail(
    user: any,
    details: {
      packageName: string;
      academicSession: string;
      amount: number;
      reference: string;
      expiresAt: Date;
    },
  ) {
    try {
      const firstName = user.firstName || 'Student';
      const formattedAmount = `₦${Number(details.amount).toLocaleString()}`;
      const expiryFormatted = new Date(details.expiresAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      const content = `
        <p style="margin: 0 0 16px 0;">Hello <strong>${firstName}</strong>,</p>
        <p style="margin: 0 0 20px 0;">
          Thank you for subscribing! Your payment has been confirmed and your <strong>${details.packageName}</strong> is now fully active.
        </p>
        
        <div style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 16px; padding: 24px; margin: 24px 0;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 6px 0; color: #6B7280; font-size: 14px;">Package:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 700; color: #111827;">${details.packageName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6B7280; font-size: 14px;">Academic Session:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #111827;">${details.academicSession}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6B7280; font-size: 14px;">Amount Paid:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 800; color: #127A71; font-size: 16px;">${formattedAmount}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6B7280; font-size: 14px;">Transaction Reference:</td>
              <td style="padding: 6px 0; text-align: right; font-family: monospace; font-size: 13px; color: #374151;">${details.reference}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6B7280; font-size: 14px;">Valid Until:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #111827;">${expiryFormatted} (1 Year)</td>
            </tr>
          </table>
        </div>

        <p style="margin: 0 0 16px 0;">
          You now have unlimited access to all lessons, Google Cloud TTS audio narrations, quizzes, and curriculum progress tracking.
        </p>

        <p style="margin: 20px 0 0 0; font-size: 13px; color: #6B7280;">
          If you have any questions, reach out to our team at <a href="mailto:odysseyjnrboss@gmail.com" style="color: #127A71;">odysseyjnrboss@gmail.com</a>.
        </p>
      `;

      await this.mailerService.sendMail({
        to: user.email,
        subject: `Payment Successful: ${details.packageName} Receipt 💳`,
        html: this.renderBaseTemplate({
          title: 'Payment Successful! 🎉',
          subtitle: `Your subscription to ${details.packageName} is confirmed.`,
          content,
        }),
      });
      this.logger.log(`Subscription receipt email sent to ${user.email} (${details.reference})`);
    } catch (err) {
      this.logger.error(`Failed to send subscription receipt to ${user.email}`, err);
    }
  }

  async sendSubscriptionReminderEmail(
    user: any,
    details: { packageName: string; expiryDate: Date; daysLeft: number },
  ) {
    try {
      const firstName = user.firstName || 'Student';
      const expiryFormatted = new Date(details.expiryDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      const content = `
        <p style="margin: 0 0 16px 0;">Hello <strong>${firstName}</strong>,</p>
        <p style="margin: 0 0 20px 0;">
          This is a friendly reminder that your <strong>${details.packageName}</strong> subscription on KSCHOOLMATE will expire in <strong>${details.daysLeft} days</strong> (on <strong>${expiryFormatted}</strong>).
        </p>

        <div style="background-color: #FEF3C7; border: 1px solid #FDE68A; border-radius: 14px; padding: 20px; margin: 24px 0;">
          <h3 style="margin: 0 0 8px 0; font-size: 15px; font-weight: 700; color: #92400E;">
            Keep Your Learning Streak Active
          </h3>
          <p style="margin: 0; font-size: 14px; color: #78350F; line-height: 20px;">
            Renew today to ensure uninterrupted access to your audio lessons, teacher notes, and exam prep quizzes.
          </p>
        </div>

        <p style="margin: 20px 0 0 0; font-size: 13px; color: #6B7280;">
          Open the KSCHOOLMATE mobile app to renew your subscription via Monnify.
        </p>
      `;

      await this.mailerService.sendMail({
        to: user.email,
        subject: `Upcoming Renewal: Your KSCHOOLMATE Subscription Expires in ${details.daysLeft} Days ⏳`,
        html: this.renderBaseTemplate({
          title: 'Subscription Renewal Reminder ⏳',
          subtitle: `Your learning package expires on ${expiryFormatted}.`,
          content,
        }),
      });
      this.logger.log(`Subscription reminder sent to ${user.email}`);
    } catch (err) {
      this.logger.error(`Failed to send reminder email to ${user.email}`, err);
    }
  }

  async sendSubscriptionGraceNoticeEmail(
    user: any,
    details: { packageName: string; graceExpiryDate: Date; graceDaysLeft: number },
  ) {
    try {
      const firstName = user.firstName || 'Student';
      const graceDateFormatted = new Date(details.graceExpiryDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      const content = `
        <p style="margin: 0 0 16px 0;">Hello <strong>${firstName}</strong>,</p>
        <p style="margin: 0 0 20px 0;">
          Your annual subscription for <strong>${details.packageName}</strong> has reached its renewal date today.
        </p>

        <div style="background-color: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 14px; padding: 20px; margin: 24px 0;">
          <h3 style="margin: 0 0 8px 0; font-size: 15px; font-weight: 700; color: #1E40AF;">
            7-Day Grace Period Active 🛡️
          </h3>
          <p style="margin: 0; font-size: 14px; color: #1E3A8A; line-height: 20px;">
            Don't worry! We have granted you a <strong>7-day grace period</strong> until <strong>${graceDateFormatted}</strong> with full learning access while you renew your subscription.
          </p>
        </div>

        <p style="margin: 0 0 16px 0;">
          After ${graceDateFormatted}, access to advanced lessons and quizzes will be paused until renewal payment is completed.
        </p>
      `;

      await this.mailerService.sendMail({
        to: user.email,
        subject: `Notice: 7-Day Grace Period for ${details.packageName} 🛡️`,
        html: this.renderBaseTemplate({
          title: 'Grace Period Activated 🛡️',
          subtitle: `You have 7 days of complimentary access until ${graceDateFormatted}.`,
          content,
        }),
      });
      this.logger.log(`Grace period notice sent to ${user.email}`);
    } catch (err) {
      this.logger.error(`Failed to send grace notice to ${user.email}`, err);
    }
  }

  async sendSubscriptionExpiredEmail(user: any, details: { packageName: string }) {
    try {
      const firstName = user.firstName || 'Student';
      const content = `
        <p style="margin: 0 0 16px 0;">Hello <strong>${firstName}</strong>,</p>
        <p style="margin: 0 0 20px 0;">
          Your 7-day grace period for <strong>${details.packageName}</strong> has now concluded, and your subscription has expired.
        </p>

        <p style="margin: 0 0 16px 0;">
          To regain instant access to all subjects, audio explanations, and quiz assessments, simply open KSCHOOLMATE on your mobile phone and renew your annual subscription.
        </p>
      `;

      await this.mailerService.sendMail({
        to: user.email,
        subject: `Your KSCHOOLMATE Subscription Has Expired`,
        html: this.renderBaseTemplate({
          title: 'Subscription Expired',
          subtitle: 'Renew your subscription anytime to continue learning.',
          content,
        }),
      });
      this.logger.log(`Subscription expired email sent to ${user.email}`);
    } catch (err) {
      this.logger.error(`Failed to send expired email to ${user.email}`, err);
    }
  }

  async sendTeacherInviteEmail(
    teacher: any,
    details?: { 
      password?: string;
      assignedClass?: string; 
      classes?: string[];
      subject?: string;
      subjects?: string[];
      permissions?: string[];
    },
  ) {
    try {
      const firstName = teacher.firstName || 'Teacher';
      const fullName = `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() || 'Educator';
      
      const classList = details?.classes && details.classes.length > 0 
        ? details.classes 
        : (teacher.classes && teacher.classes.length > 0 ? teacher.classes : [details?.assignedClass || teacher.class || 'Assigned Class']);
      
      const subjectList = details?.subjects && details.subjects.length > 0
        ? details.subjects
        : (teacher.subjects && teacher.subjects.length > 0 ? teacher.subjects : [details?.subject || teacher.subject || 'Assigned Subject']);

      const permissionsList = details?.permissions && details.permissions.length > 0
        ? details.permissions
        : (teacher.permissions && teacher.permissions.length > 0 ? teacher.permissions : ['lessons', 'exercises', 'quizzes', 'students']);

      const rawPassword = details?.password;
      const portalUrl = process.env.ADMIN_URL || 'http://localhost:3000/login';

      const classesBadgeHtml = classList
        .map(
          (c: string) => `<span style="display: inline-block; background-color: #E0F2FE; color: #0369A1; font-weight: 700; font-size: 12px; padding: 4px 10px; border-radius: 6px; margin: 2px 4px 2px 0;">${c}</span>`
        )
        .join('');

      const subjectsBadgeHtml = subjectList
        .map(
          (s: string) => `<span style="display: inline-block; background-color: #ECFDF5; color: #065F46; font-weight: 700; font-size: 12px; padding: 4px 10px; border-radius: 6px; margin: 2px 4px 2px 0;">${s}</span>`
        )
        .join('');

      const permissionsBadgeHtml = permissionsList
        .map(
          (p: string) => `<span style="display: inline-block; background-color: #F3F4F6; color: #374151; font-weight: 600; font-size: 11px; text-transform: uppercase; padding: 3px 8px; border-radius: 4px; margin: 2px 4px 2px 0;">${p}</span>`
        )
        .join('');

      const content = `
        <p style="margin: 0 0 16px 0;">Hello <strong>${fullName}</strong>,</p>
        <p style="margin: 0 0 20px 0;">
          You have been formally invited to join the <strong>KSCHOOLMATE Teaching Faculty</strong>! An instructor account has been created for you with direct access to manage curriculum, assignments, and student engagement.
        </p>

        <!-- Credentials Card -->
        <div style="background-color: #F8FAFC; border: 1.5px solid #CBD5E1; border-radius: 16px; padding: 22px; margin: 24px 0;">
          <h3 style="margin: 0 0 14px 0; font-size: 15px; font-weight: 800; color: #0F172A; text-transform: uppercase; letter-spacing: 0.5px;">
            🔐 Your Account Login Credentials
          </h3>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size: 14px; color: #334155;">
            <tr>
              <td style="padding: 6px 0; font-weight: 600; color: #64748B; width: 140px;">Portal Login URL:</td>
              <td style="padding: 6px 0; font-weight: 700; color: #127A71;">
                <a href="${portalUrl}" style="color: #127A71; text-decoration: underline;">${portalUrl}</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: 600; color: #64748B;">Username / Email:</td>
              <td style="padding: 6px 0; font-family: monospace; font-size: 14px; font-weight: 700; color: #0F172A;">${teacher.email}</td>
            </tr>
            ${
              rawPassword
                ? `
            <tr>
              <td style="padding: 6px 0; font-weight: 600; color: #64748B;">Generated Password:</td>
              <td style="padding: 6px 0;">
                <span style="display: inline-block; background-color: #ECFDF5; border: 1px dashed #0D6D62; color: #0D6D62; font-family: monospace; font-size: 16px; font-weight: 800; padding: 6px 14px; border-radius: 8px; letter-spacing: 1px;">
                  ${rawPassword}
                </span>
              </td>
            </tr>
            `
                : ''
            }
          </table>
          <p style="margin: 12px 0 0 0; font-size: 12px; color: #64748B;">
            ℹ️ Please log in and change your password in your settings if desired.
          </p>
        </div>

        <!-- Assignment Details -->
        <div style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 16px; padding: 22px; margin: 24px 0;">
          <h3 style="margin: 0 0 14px 0; font-size: 15px; font-weight: 700; color: #127A71;">
            📚 Your Teaching Assignment & Permissions
          </h3>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size: 14px; color: #374151;">
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: #6B7280; width: 140px; vertical-align: top;">Assigned Classes:</td>
              <td style="padding: 8px 0;">
                ${classesBadgeHtml}
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: #6B7280; vertical-align: top;">Assigned Subjects:</td>
              <td style="padding: 8px 0;">
                ${subjectsBadgeHtml}
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: #6B7280; vertical-align: top;">Page Permissions:</td>
              <td style="padding: 8px 0;">
                ${permissionsBadgeHtml}
              </td>
            </tr>
          </table>
        </div>

        <!-- Action Button -->
        <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 28px 0 16px 0;">
          <tr>
            <td align="center" style="border-radius: 28px; background-color: #127A71;">
              <a href="${portalUrl}" target="_blank" style="font-size: 15px; font-weight: 700; color: #FFFFFF; text-decoration: none; padding: 14px 34px; display: inline-block;">
                Sign In to Teacher Portal →
              </a>
            </td>
          </tr>
        </table>

        <p style="margin: 24px 0 0 0; font-size: 13px; color: #6B7280;">
          If you have any questions or require assistance accessing your classes, please reach out to the school administration office.
        </p>
      `;

      await this.mailerService.sendMail({
        to: teacher.email,
        subject: `Welcome to KSCHOOLMATE Faculty: Your Account Credentials 🎓`,
        html: this.renderBaseTemplate({
          title: `Faculty Invitation: Welcome ${firstName} 🎓`,
          subtitle: `Your teacher account and login credentials are ready.`,
          content,
        }),
      });
      this.logger.log(`Teacher invite email successfully dispatched to ${teacher.email}`);
    } catch (err) {
      this.logger.error(`Failed to send teacher invite email to ${teacher.email}:`, err);
    }
  }
}
