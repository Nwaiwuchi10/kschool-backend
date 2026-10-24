import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Express } from 'express';
import { AppModule } from './app.module';

const server: Express = express();
let isReady = false;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('KSCHOOLMATE API')
    .setDescription('The API documentation for KSCHOOLMATE Odysessy School Mobile App.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  app.enableCors();
  await app.init();
  isReady = true;
}

const bootstrapPromise = bootstrap();

// Local execution if run directly outside Vercel
if (!process.env.VERCEL) {
  bootstrapPromise.then(() => {
    const port = process.env.PORT ?? 3500;
    server.listen(port, () => {
      console.log(`Server listening on http://localhost:${port}`);
    });
  });
}

// Serverless handler for Vercel
export default async function handler(req: any, res: any) {
  if (!isReady) {
    await bootstrapPromise;
  }
  server(req, res);
}
