import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  private userWithoutPassword() {
    return {
      id: true,
      login: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    } as const;
  }

  async findAll(): Promise<Omit<User, 'password'>[]> {
    return this.prisma.user.findMany({
      select: this.userWithoutPassword(),
    });
  }

  async findOne(id: string): Promise<Omit<User, 'password'>> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: this.userWithoutPassword(),
    });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return user;
  }

  async findByLogin(login: string): Promise<User | null> {
    return this.prisma.user.findFirst({ where: { login } });
  }

  async create(dto: CreateUserDto): Promise<Omit<User, 'password'>> {
    const existing = await this.prisma.user.findFirst({
      where: { login: dto.login },
    });
    if (existing) {
      throw new BadRequestException(`Login "${dto.login}" is already taken`);
    }

    const salt = parseInt(process.env.CRYPT_SALT ?? '10', 10);
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

  async updateUser(
    id: string,
    dto: UpdatePasswordDto & { role?: string },
  ): Promise<Omit<User, 'password'>> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    const data: Record<string, unknown> = {};

    if (dto.oldPassword && dto.newPassword) {
      const isMatch = await bcrypt.compare(dto.oldPassword, user.password);
      if (!isMatch) {
        throw new ForbiddenException('Old password is incorrect');
      }
      const salt = parseInt(process.env.CRYPT_SALT ?? '10', 10);
      data.password = await bcrypt.hash(dto.newPassword, salt);
    }

    if (dto.role) {
      data.role = dto.role.toUpperCase();
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: this.userWithoutPassword(),
    });
  }

  async remove(id: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    await this.prisma.$transaction([
      this.prisma.article.updateMany({
        where: { authorId: id },
        data: { authorId: null },
      }),
      this.prisma.user.delete({ where: { id } }),
    ]);
  }
}
