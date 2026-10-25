import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionPackage, SubscriptionPackageSchema } from './schemas/subscription-package.schema';
import { UserSubscription, UserSubscriptionSchema } from './schemas/user-subscription.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Topic, TopicSchema } from '../subjects/schemas/topic.schema';
import { Lesson, LessonSchema } from '../subjects/schemas/lesson.schema';
import { Subject, SubjectSchema } from '../subjects/schemas/subject.schema';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SubscriptionPackage.name, schema: SubscriptionPackageSchema },
      { name: UserSubscription.name, schema: UserSubscriptionSchema },
      { name: User.name, schema: UserSchema },
      { name: Topic.name, schema: TopicSchema },
      { name: Lesson.name, schema: LessonSchema },
      { name: Subject.name, schema: SubjectSchema },
    ]),
    MailModule,
  ],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
