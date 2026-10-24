import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';
import { SchoolClass, SchoolClassSchema } from './schemas/class.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { UserSubscription, UserSubscriptionSchema } from '../subscriptions/schemas/user-subscription.schema';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SchoolClass.name, schema: SchoolClassSchema },
      { name: User.name, schema: UserSchema },
      { name: UserSubscription.name, schema: UserSubscriptionSchema },
    ]),
    MailModule,
  ],
  controllers: [ClassesController],
  providers: [ClassesService],
  exports: [ClassesService],
})
export class ClassesModule {}
