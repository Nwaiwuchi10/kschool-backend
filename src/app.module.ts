import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { UsersModule } from './users/users.module';

import { MailModule } from './mail/mail.module';

import { AuthModule } from './auth/auth.module';

import { SubjectsModule } from './subjects/subjects.module';

import { QuizzesModule } from './quizzes/quizzes.module';

import { SubscriptionsModule } from './subscriptions/subscriptions.module';

import { PaymentsModule } from './payments/payments.module';

import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { ClassesModule } from './classes/classes.module';
import { TtsModule } from './tts/tts.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AiGeneratorModule } from './ai-generator/ai-generator.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGO_URI'),
      }),
    }),
    UsersModule,
    MailModule,
    AuthModule,
    SubjectsModule,
    QuizzesModule,
    SubscriptionsModule,
    PaymentsModule,
    CloudinaryModule,
    ClassesModule,
    TtsModule,
    DashboardModule,
    AiGeneratorModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
