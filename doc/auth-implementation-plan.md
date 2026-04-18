# План реализации: Authentication & Authorization

## Обзор

Реализация JWT-аутентификации (Access + Refresh токены) и ролевой модели доступа (RBAC) для Knowledge Hub API на базе NestJS + Prisma.

**Что уже есть в проекте:**
- Зависимости `@nestjs/jwt` и `bcrypt` в `package.json`
- Prisma-схема с `UserRole` enum (`ADMIN`, `EDITOR`, `VIEWER`)
- Тесты готовы: `test:auth`, `test:refresh`, `test:rbac`
- Переменные окружения (`JWT_SECRET_KEY`, `JWT_SECRET_REFRESH_KEY`) в `.env`
- Тестовые утилиты (`getTokenAndUserId`, `getUserTokenByRole`, `generateRefreshToken`)

**Что нужно реализовать:**
- Auth Module (signup, login, refresh endpoints)
- Хэширование паролей через bcrypt
- JWT Guard (глобальный) для защиты всех роутов
- RBAC Guard для контроля доступа по ролям
- Обновление `UserService` / `UserController` (хэш-пароли, роли)

---

## Фаза 1: Переменные окружения и конфигурация

### 1.1. Обновить `.env`

Убедиться что файл `.env` содержит все необходимые переменные:

```env
CRYPT_SALT=10
JWT_SECRET_KEY=your_access_token_secret
JWT_SECRET_REFRESH_KEY=your_refresh_token_secret
TOKEN_EXPIRE_TIME=1h
TOKEN_REFRESH_EXPIRE_TIME=24h
```

> **Важно:** Тесты (`test/utils/tokens.ts`) используют `JWT_SECRET_REFRESH_KEY` для генерации refresh-токенов. Нужно использовать именно эти имена переменных, а не `JWT_SECRET` / `JWT_REFRESH_SECRET`.

### 1.2. Никаких дополнительных пакетов не нужно

Всё уже установлено: `@nestjs/jwt`, `bcrypt`, `@types/bcrypt`, `jsonwebtoken`, `@types/jsonwebtoken`.

---

## Фаза 2: Хэширование паролей (bcrypt)

### 2.1. Обновить `UserService.create()` — хэшировать пароль при создании

**Файл:** `src/user/user.service.ts`

```typescript
import * as bcrypt from 'bcrypt';

// В методе create():
async create(dto: CreateUserDto): Promise<Omit<User, 'password'>> {
  const salt = parseInt(process.env.CRYPT_SALT) || 10;
  const hashedPassword = await bcrypt.hash(dto.password, salt);
  
  return this.prisma.user.create({
    data: {
      login: dto.login,
      password: hashedPassword,
      role: dto.role,
    },
    select: this.userWithoutPassword(),
  });
}
```

### 2.2. Обновить `UserService.updatePassword()` — сравнивать хэши

```typescript
async updatePassword(id: string, dto: UpdatePasswordDto): Promise<Omit<User, 'password'>> {
  const user = await this.prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new NotFoundException(`User with id ${id} not found`);
  }
  
  const isMatch = await bcrypt.compare(dto.oldPassword, user.password);
  if (!isMatch) {
    throw new ForbiddenException('Old password is incorrect');
  }
  
  const salt = parseInt(process.env.CRYPT_SALT) || 10;
  const hashedPassword = await bcrypt.hash(dto.newPassword, salt);
  
  return this.prisma.user.update({
    where: { id },
    data: { password: hashedPassword },
    select: this.userWithoutPassword(),
  });
}
```

### 2.3. Добавить метод `findByLogin()` в `UserService`

Этот метод нужен для Auth Module — возвращает пользователя **с паролем** для проверки:

```typescript
async findByLogin(login: string): Promise<User | null> {
  return this.prisma.user.findFirst({ where: { login } });
}
```

### 2.4. Добавить проверку уникальности логина

В методе `create()` нужно проверять что логин не занят, иначе 400:

```typescript
const existing = await this.prisma.user.findFirst({ where: { login: dto.login } });
if (existing) {
  throw new BadRequestException(`Login "${dto.login}" is already taken`);
}
```

---

## Фаза 3: Auth Module

### 3.1. Структура файлов

```
src/auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── dto/
│   ├── signup.dto.ts
│   └── login.dto.ts
│   └── refresh.dto.ts
├── guards/
│   ├── jwt-auth.guard.ts
│   └── roles.guard.ts
└── decorators/
    ├── public.decorator.ts
    └── roles.decorator.ts
```

### 3.2. DTO

**`src/auth/dto/signup.dto.ts`**
```typescript
import { IsString, IsNotEmpty } from 'class-validator';

export class SignupDto {
  @IsString()
  @IsNotEmpty()
  login: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
```

**`src/auth/dto/login.dto.ts`**
```typescript
import { IsString, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  login: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
```

**`src/auth/dto/refresh.dto.ts`**
```typescript
import { IsString, IsNotEmpty } from 'class-validator';

export class RefreshDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
```

### 3.3. Auth Service

**Файл:** `src/auth/auth.service.ts`

```typescript
import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  // POST /auth/signup
  async signup(dto: SignupDto) {
    // userService.create() уже хэширует пароль и проверяет уникальность логина
    return this.userService.create({
      login: dto.login,
      password: dto.password,
    });
  }

  // POST /auth/login
  async login(dto: LoginDto) {
    const user = await this.userService.findByLogin(dto.login);
    if (!user) {
      throw new ForbiddenException('Invalid login or password');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new ForbiddenException('Invalid login or password');
    }

    const payload = {
      userId: user.id,
      login: user.login,
      role: user.role.toLowerCase(), // тесты ожидают lowercase: 'admin', 'editor', 'viewer'
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET_KEY,
      expiresIn: process.env.TOKEN_EXPIRE_TIME || '1h',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET_REFRESH_KEY,
      expiresIn: process.env.TOKEN_REFRESH_EXPIRE_TIME || '24h',
    });

    return { accessToken, refreshToken };
  }

  // POST /auth/refresh
  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_SECRET_REFRESH_KEY,
      });

      // Генерируем новую пару токенов
      const newPayload = {
        userId: payload.userId,
        login: payload.login,
        role: payload.role,
      };

      const newAccessToken = this.jwtService.sign(newPayload, {
        secret: process.env.JWT_SECRET_KEY,
        expiresIn: process.env.TOKEN_EXPIRE_TIME || '1h',
      });

      const newRefreshToken = this.jwtService.sign(newPayload, {
        secret: process.env.JWT_SECRET_REFRESH_KEY,
        expiresIn: process.env.TOKEN_REFRESH_EXPIRE_TIME || '24h',
      });

      return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    } catch {
      throw new ForbiddenException('Invalid or expired refresh token');
    }
  }
}
```

### 3.4. Auth Controller

**Файл:** `src/auth/auth.controller.ts`

```typescript
import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from './decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('signup')
  async signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: Record<string, any>) {
    // Тесты отправляют body без DTO-валидации и ожидают 401 если поле отсутствует
    if (!body?.refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }
    return this.authService.refresh(body.refreshToken);
  }
}
```

> **Важно:** Для `refresh` не используем DTO с class-validator, потому что тесты ожидают **401** (UnauthorizedException) при отсутствии `refreshToken`, а class-validator вернул бы **400** (BadRequest). Поэтому валидируем вручную.

### 3.5. Auth Module

**Файл:** `src/auth/auth.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    UserModule,
    JwtModule.register({}), // Секреты передаются при sign/verify
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
```

---

## Фаза 4: JWT Guard (Authentication)

### 4.1. Декоратор `@Public()`

Маркирует роуты, не требующие аутентификации.

**Файл:** `src/auth/decorators/public.decorator.ts`

```typescript
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

### 4.2. JWT Auth Guard (глобальный)

**Файл:** `src/auth/guards/jwt-auth.guard.ts`

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Проверяем декоратор @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is missing');
    }

    // Проверяем Bearer-схему
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new UnauthorizedException('Invalid authorization header format');
    }

    const token = parts[1];

    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET_KEY,
      });
      // Прикрепляем payload к request для дальнейшего использования
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Token is invalid or expired');
    }
  }
}
```

### 4.3. Регистрация Guard глобально

**Файл:** `src/app.module.ts` — добавить `APP_GUARD`:

```typescript
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

@Module({
  imports: [
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
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
```

### 4.4. Пометить публичные роуты декоратором `@Public()`

Роуты, которые **не** требуют аутентификации (из задания):
- `/auth/signup` — уже в AuthController с `@Public()`
- `/auth/login` — уже в AuthController с `@Public()`
- `/auth/refresh` — уже в AuthController с `@Public()`
- `/doc` — Swagger, обрабатывается NestJS автоматически (не роут контроллера)
- `/` — добавить `@Public()` в `AppController`

**Файл:** `src/app.controller.ts` — добавить `@Public()`:

```typescript
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './auth/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
```

---

## Фаза 5: RBAC (Role-Based Access Control)

### 5.1. Декоратор `@Roles()`

**Файл:** `src/auth/decorators/roles.decorator.ts`

```typescript
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```

### 5.2. Roles Guard

**Файл:** `src/auth/guards/roles.guard.ts`

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Пропускаем публичные роуты
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Если @Roles() не указан — определяем разрешения по HTTP-методу
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Access denied');
    }

    const role = user.role; // 'admin', 'editor', 'viewer'
    const method = request.method; // GET, POST, PUT, DELETE

    // Admin — полный доступ
    if (role === 'admin') return true;

    // Если указаны конкретные роли через @Roles() — проверяем
    if (requiredRoles) {
      if (!requiredRoles.includes(role)) {
        throw new ForbiddenException('Insufficient permissions');
      }
      return true;
    }

    // Viewer — только GET
    if (role === 'viewer') {
      if (method === 'GET') return true;
      throw new ForbiddenException('Viewers can only perform read operations');
    }

    // Editor — GET + POST/PUT (с ограничениями, проверяемыми в контроллерах)
    if (role === 'editor') {
      if (method === 'GET' || method === 'POST' || method === 'PUT') {
        return true;
      }
      throw new ForbiddenException('Editors cannot delete resources');
    }

    throw new ForbiddenException('Access denied');
  }
}
```

### 5.3. Зарегистрировать RolesGuard глобально

В `src/app.module.ts` добавить второй `APP_GUARD`:

```typescript
providers: [
  AppService,
  {
    provide: APP_GUARD,
    useClass: JwtAuthGuard,
  },
  {
    provide: APP_GUARD,
    useClass: RolesGuard,
  },
],
```

> **Порядок важен:** Сначала JwtAuthGuard (устанавливает `request.user`), потом RolesGuard (проверяет роль).

---

## Фаза 6: Доработка контроллеров для RBAC

### 6.1. Модель доступа (что тесты проверяют)

| Ресурс     | Метод  | viewer | editor    | admin |
|-----------|--------|--------|-----------|-------|
| **User**  | GET    | ✅     | ✅        | ✅    |
| **User**  | POST   | ❌     | ❌        | ✅    |
| **User**  | PUT    | ❌ (чужих) | ❌ (чужих) | ✅    |
| **User**  | DELETE | ❌     | ❌        | ✅    |
| **Article** | GET  | ✅     | ✅        | ✅    |
| **Article** | POST | ❌     | ✅ (свои) | ✅    |
| **Article** | PUT  | ❌     | ✅ (свои) | ✅    |
| **Article** | DELETE | ❌   | ❌        | ✅    |
| **Category** | GET | ✅     | ✅        | ✅    |
| **Category** | POST | ❌    | ❌        | ✅    |
| **Category** | PUT | ❌     | ❌        | ✅    |
| **Category** | DELETE | ❌  | ❌        | ✅    |
| **Comment** | GET  | ✅     | ✅        | ✅    |
| **Comment** | POST | ❌     | ✅ (свои) | ✅    |
| **Comment** | DELETE | ❌   | ❌        | ✅    |

### 6.2. Ограничения для Editor

RolesGuard пропускает Editor для GET/POST/PUT, но нужно ограничить:

1. **User:** Editor не может POST/PUT/DELETE других пользователей
2. **Article:** Editor может POST/PUT только свои статьи, не может DELETE
3. **Category:** Editor не может POST/PUT/DELETE категории
4. **Comment:** Editor может POST свои комменты, не может DELETE

Это делается через `@Roles()` на конкретных методах контроллера:

**`src/user/user.controller.ts`** — POST, PUT, DELETE доступны только admin:
```typescript
@Roles('admin')
@Post()
create(@Body() dto: CreateUserDto) { ... }

@Roles('admin')
@Put(':id')
updatePassword(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePasswordDto) { ... }

@Roles('admin')
@Delete(':id')
remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> { ... }
```

**`src/category/category.controller.ts`** — POST, PUT, DELETE доступны только admin:
```typescript
@Roles('admin')
@Post()
create(@Body() dto: CreateCategoryDto) { ... }

@Roles('admin')
@Put(':id')
update(...) { ... }

@Roles('admin')
@Delete(':id')
remove(...) { ... }
```

**`src/article/article.controller.ts`** — DELETE только admin:
```typescript
@Roles('admin')
@Delete(':id')
remove(...) { ... }
```

**`src/comment/comment.controller.ts`** — DELETE только admin:
```typescript
@Roles('admin')
@Delete(':id')
remove(...) { ... }
```

### 6.3. PUT для User — поддержка обновления роли

Тесты (`getUserTokenByRole`) отправляют `PUT /user/:id` с `{ role: 'editor' }` для смены роли (от admin). Нужно расширить:

**`src/user/dto/update-password.dto.ts`** или создать отдельный DTO:

Добавить `role` в обработку PUT, чтобы admin мог менять роль пользователя. Один из подходов: проверять в контроллере или сервисе, есть ли `role` в body, и обновлять:

```typescript
// В UserService
async updateUser(id: string, dto: any): Promise<Omit<User, 'password'>> {
  const user = await this.prisma.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundException(...);

  const data: any = {};

  // Если есть oldPassword/newPassword — обновляем пароль
  if (dto.oldPassword && dto.newPassword) {
    const isMatch = await bcrypt.compare(dto.oldPassword, user.password);
    if (!isMatch) throw new ForbiddenException('Old password is incorrect');
    data.password = await bcrypt.hash(dto.newPassword, parseInt(process.env.CRYPT_SALT) || 10);
  }

  // Если есть role — обновляем роль (проверка прав в guard/контроллере)
  if (dto.role) {
    data.role = dto.role.toUpperCase();
  }

  return this.prisma.user.update({
    where: { id },
    data,
    select: this.userWithoutPassword(),
  });
}
```

---

## Фаза 7: Обновить AppModule и подключить всё

### 7.1. Итоговый `src/app.module.ts`

```typescript
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

@Module({
  imports: [
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
```

---

## Фаза 8: Совместимость с тестами

### 8.1. Ключевые контракты из тестов

Анализ тестовых утилит показывает, какие именно контракты ожидаются:

#### `test/utils/getTokenAndUserId.ts`
1. `POST /auth/signup` с `{ login, password }` → тело ответа содержит `{ id }` (UUID созданного пользователя)
2. `POST /auth/login` с `{ login, password }` → тело ответа содержит `{ accessToken, refreshToken }`
3. Signup возвращает 201 (POST default)

#### `test/utils/getUserTokenByRole.ts`
1. `POST /auth/signup` → `{ id }` в ответе
2. `PUT /user/:id` с `{ role: 'editor' | 'admin' }` от admin → обновляет роль (должен вернуть 200)
3. `POST /auth/login` → `{ accessToken }`

#### `test/utils/tokens.ts`
1. Refresh-токен подписывается секретом `JWT_SECRET_REFRESH_KEY` из `.env`
2. Используется библиотека `jsonwebtoken` (не `@nestjs/jwt`) — совместимо, оба используют JWT стандарт

#### `test/refresh/refresh.e2e.spec.ts`
1. JWT payload должен содержать: `userId`, `login`, `role`, `exp`
2. `role` — строка в lowercase: `'admin'`, `'editor'`, `'viewer'`
3. `userId` — валидный UUID
4. `exp` refresh-токена > `exp` access-токена
5. POST `/auth/refresh` с `{ refreshToken }` → `{ accessToken, refreshToken }` (200)
6. POST `/auth/refresh` без body → **401**
7. POST `/auth/refresh` с невалидным refreshToken → **403**
8. POST `/auth/refresh` с expired refreshToken → **403**

#### `test/auth/*.e2e.spec.ts`
1. Все CRUD-эндпоинты `/user`, `/article`, `/category`, `/comment` без токена → **401**

#### `test/rbac/*.e2e.spec.ts`
1. Viewer: только GET → 200; POST/PUT/DELETE → **403**
2. Editor: GET → 200; POST/PUT своих → 200/201; DELETE → **403**
3. Admin: полный CRUD → 200/201/204

### 8.2. Критические моменты совместимости

| Что                                    | Ожидание тестов               | Как реализовать                    |
|----------------------------------------|-------------------------------|------------------------------------|
| Signup response body                   | `{ id, login, role, ... }`   | Вернуть данные `userService.create()` (без пароля) |
| Login response body                    | `{ accessToken, refreshToken }` | Вернуть оба токена                |
| JWT `role` значение                   | lowercase (`'viewer'`)        | `user.role.toLowerCase()` в payload |
| JWT `userId` в payload                | UUID string                   | `user.id`                          |
| Refresh без body                      | 401                           | Ручная валидация, не DTO          |
| Refresh с invalid/expired token       | 403                           | catch + ForbiddenException        |
| PUT /user/:id с `{ role }`           | 200                           | Обновить role в UserService       |
| DELETE /user/:id                      | 204                           | Уже реализовано                   |

---

## Фаза 9: Порядок реализации (чеклист)

### Этап 1 — Bcrypt и UserService (Prerequisite)
- [ ] Добавить `import * as bcrypt from 'bcrypt'` в `user.service.ts`
- [ ] Хэширование пароля в `create()`
- [ ] Сравнение хэшей в `updatePassword()`
- [ ] Добавить метод `findByLogin()` (возвращает User с паролем)
- [ ] Проверка уникальности логина в `create()`
- [ ] Добавить поддержку обновления role в `PUT /user/:id`

### Этап 2 — Auth Module (Core)
- [ ] Создать `src/auth/dto/signup.dto.ts`
- [ ] Создать `src/auth/dto/login.dto.ts`
- [ ] Создать `src/auth/auth.service.ts`
- [ ] Создать `src/auth/auth.controller.ts`
- [ ] Создать `src/auth/auth.module.ts`
- [ ] Создать `src/auth/decorators/public.decorator.ts`

### Этап 3 — JWT Guard (Authentication)
- [ ] Создать `src/auth/guards/jwt-auth.guard.ts`
- [ ] Зарегистрировать как `APP_GUARD` в `AppModule`
- [ ] Пометить `@Public()` на: auth-контроллер, root `/`
- [ ] Проверить что `test:auth` тесты проходят

### Этап 4 — RBAC Guard (Authorization)
- [ ] Создать `src/auth/decorators/roles.decorator.ts`
- [ ] Создать `src/auth/guards/roles.guard.ts`
- [ ] Зарегистрировать как `APP_GUARD` в `AppModule`
- [ ] Добавить `@Roles('admin')` на POST/PUT/DELETE в UserController
- [ ] Добавить `@Roles('admin')` на POST/PUT/DELETE в CategoryController
- [ ] Добавить `@Roles('admin')` на DELETE в ArticleController
- [ ] Добавить `@Roles('admin')` на DELETE в CommentController
- [ ] Проверить что `test:rbac` тесты проходят

### Этап 5 — Refresh Token
- [ ] Реализовать `POST /auth/refresh` в AuthController
- [ ] Ручная валидация наличия refreshToken (401 без, 403 на ошибку)
- [ ] Проверить что `test:refresh` тесты проходят

### Этап 6 — Финальная проверка
- [ ] `npm run test:auth` — все тесты проходят
- [ ] `npm run test:refresh` — все тесты проходят
- [ ] `npm run test:rbac` — все тесты проходят
- [ ] `npm run test` — основные тесты не сломаны
- [ ] Swagger `/doc` доступен без авторизации

---

## Структура новых файлов

```
src/auth/
├── auth.module.ts              # Модуль: imports JwtModule, UserModule
├── auth.controller.ts          # Эндпоинты: signup, login, refresh
├── auth.service.ts             # Бизнес-логика: signup, login, refresh
├── dto/
│   ├── signup.dto.ts           # { login, password }
│   └── login.dto.ts            # { login, password }
├── guards/
│   ├── jwt-auth.guard.ts       # Глобальный guard для JWT
│   └── roles.guard.ts          # Глобальный guard для RBAC
└── decorators/
    ├── public.decorator.ts     # @Public() — исключает из аутентификации
    └── roles.decorator.ts      # @Roles('admin') — ограничивает по ролям
```

## Изменяемые файлы

| Файл | Что менять |
|------|-----------|
| `src/app.module.ts` | Добавить AuthModule, JwtModule, APP_GUARD (JwtAuthGuard, RolesGuard) |
| `src/app.controller.ts` | Добавить `@Public()` на корневой GET `/` |
| `src/user/user.service.ts` | bcrypt хэширование, `findByLogin()`, уникальность логина, обновление роли |
| `src/user/user.controller.ts` | Добавить `@Roles('admin')` на POST, PUT, DELETE |
| `src/article/article.controller.ts` | Добавить `@Roles('admin')` на DELETE |
| `src/comment/comment.controller.ts` | Добавить `@Roles('admin')` на DELETE |
| `src/category/category.controller.ts` | Добавить `@Roles('admin')` на POST, PUT, DELETE |
| `.env` | Убедиться что JWT_SECRET_KEY, JWT_SECRET_REFRESH_KEY, CRYPT_SALT заполнены |
