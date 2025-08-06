import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = new DocumentBuilder()
    .setTitle('Property Activity Tracker API')
    .setDescription(
      'backend system for a map-based property activity tracker. Each property has a geographic location, and sales representatives can perform various activity types related to that property (e.g., visit, call, inspect, follow-up).',
    )
    .setVersion('1.0')
    .addTag('users') // Add tags for grouping endpoints
    .addBearerAuth() // If you use JWT authentication
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  app.enableCors({
    origin: 'http://127.0.0.1:5500',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
