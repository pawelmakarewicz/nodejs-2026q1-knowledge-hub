import { Injectable, NotFoundException } from '@nestjs/common';
import { Article, ArticleStatus } from '@prisma/client';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ArticleService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters?: {
    status?: string;
    categoryId?: string;
    tag?: string;
  }): Promise<Article[]> {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status as ArticleStatus;
    }
    if (filters?.categoryId) {
      where.categoryId = filters.categoryId;
    }
    if (filters?.tag) {
      where.tags = { some: { name: filters.tag } };
    }

    return this.prisma.article.findMany({
      where,
      include: { tags: true },
    });
  }

  async findOne(id: string): Promise<Article> {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: { tags: true },
    });
    if (!article) {
      throw new NotFoundException(`Article with id ${id} not found`);
    }
    return article;
  }

  async exists(id: string): Promise<boolean> {
    const article = await this.prisma.article.findUnique({ where: { id } });
    return !!article;
  }

  async create(dto: CreateArticleDto): Promise<Article> {
    return this.prisma.article.create({
      data: {
        title: dto.title,
        content: dto.content,
        status: dto.status,
        authorId: dto.authorId ?? null,
        categoryId: dto.categoryId ?? null,
        tags: dto.tags?.length
          ? {
              connectOrCreate: dto.tags.map((name) => ({
                where: { name },
                create: { name },
              })),
            }
          : undefined,
      },
      include: { tags: true },
    });
  }

  async update(id: string, dto: UpdateArticleDto): Promise<Article> {
    await this.findOne(id);

    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.content !== undefined) data.content = dto.content;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.authorId !== undefined) data.authorId = dto.authorId;
    if (dto.categoryId !== undefined) data.categoryId = dto.categoryId;
    if (dto.tags !== undefined) {
      data.tags = {
        set: [],
        connectOrCreate: dto.tags.map((name) => ({
          where: { name },
          create: { name },
        })),
      };
    }

    return this.prisma.article.update({
      where: { id },
      data,
      include: { tags: true },
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.article.delete({ where: { id } });
  }
}
