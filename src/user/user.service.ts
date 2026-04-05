import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { ArticleService } from '../article/article.service';
import { CommentService } from '../comment/comment.service';

@Injectable()
export class UserService {
  private users: User[] = [];

  constructor(
    private readonly articleService: ArticleService,
    private readonly commentService: CommentService,
  ) {}

  private toResponse(user: User): Omit<User, 'password'> {
    const { password, ...result } = user;
    return result;
  }

  findAll(): Omit<User, 'password'>[] {
    return this.users.map((u) => this.toResponse(u));
  }

  findOne(id: string): Omit<User, 'password'> {
    const user = this.users.find((u) => u.id === id);
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return this.toResponse(user);
  }

  create(dto: CreateUserDto): Omit<User, 'password'> {
    const now = Date.now();
    const user: User = {
      id: uuidv4(),
      login: dto.login,
      password: dto.password,
      role: dto.role || 'viewer',
      createdAt: now,
      updatedAt: now,
    };
    this.users.push(user);
    return this.toResponse(user);
  }

  updatePassword(
    id: string,
    dto: UpdatePasswordDto,
  ): Omit<User, 'password'> {
    const user = this.users.find((u) => u.id === id);
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    if (user.password !== dto.oldPassword) {
      throw new ForbiddenException('Old password is incorrect');
    }
    user.password = dto.newPassword;
    user.updatedAt = Date.now();
    return this.toResponse(user);
  }

  remove(id: string): void {
    const index = this.users.findIndex((u) => u.id === id);
    if (index === -1) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    this.articleService.nullifyAuthorId(id);
    this.commentService.removeByAuthorId(id);
    this.users.splice(index, 1);
  }
}
