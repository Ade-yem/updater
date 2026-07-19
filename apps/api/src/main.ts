import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ENV } from './config/env';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
  .setTitle('Updater')
  .setDescription('The API description for the Updater server')
  .setVersion('0.1')
  .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  app.enableCors({
    origin: ENV.FRONTEND_URL,
    credentials: true,
  });

  app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(ENV.PORT);
}
bootstrap();
