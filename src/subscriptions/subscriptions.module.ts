import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionPackage, SubscriptionPackageSchema } from './schemas/subscription-package.schema';
import { UserSubscription, UserSubscriptionSchema } from './schemas/user-subscription.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SubscriptionPackage.name, schema: SubscriptionPackageSchema },
      { name: UserSubscription.name, schema: UserSubscriptionSchema },
      { name: User.name, schema: UserSchema },
    ]),
    MailModule,
  ],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
