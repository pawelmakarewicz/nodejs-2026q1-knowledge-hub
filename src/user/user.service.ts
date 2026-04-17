import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { User } from '@prisma/client';
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

  async create(dto: CreateUserDto): Promise<Omit<User, 'password'>> {
    return this.prisma.user.create({
      data: {
        login: dto.login,
        password: dto.password,
        role: dto.role,
      },
      select: this.userWithoutPassword(),
    });
  }

  async updatePassword(
    id: string,
    dto: UpdatePasswordDto,
  ): Promise<Omit<User, 'password'>> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    if (user.password !== dto.oldPassword) {
      throw new ForbiddenException('Old password is incorrect');
    }
    return this.prisma.user.update({
      where: { id },
      data: { password: dto.newPassword },
      select: this.userWithoutPassword(),
    });
  }

  async remove(id: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    await this.prisma.user.delete({ where: { id } });
  }
}
