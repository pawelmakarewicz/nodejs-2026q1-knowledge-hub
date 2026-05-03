import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CategoryModule } from './category/category.module';
import { ArticleModule } from './article/article.module';
import { CommentModule } from './comment/comment.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { PrismaModule } from './prisma/prisma.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { LoggerModule } from './common/logger/logger.module';

@Module({
  imports: [
    LoggerModule,
    PrismaModule,
    JwtModule.register({}),
    UserModule,
    CategoryModule,
    ArticleModule,
    CommentModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
