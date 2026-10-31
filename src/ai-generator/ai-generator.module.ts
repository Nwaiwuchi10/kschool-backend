import { Module } from '@nestjs/common';
import { AiGeneratorController } from './ai-generator.controller';
import { AiGeneratorService } from './ai-generator.service';

@Module({
  controllers: [AiGeneratorController],
  providers: [AiGeneratorService],
  exports: [AiGeneratorService],
})
export class AiGeneratorModule {}

