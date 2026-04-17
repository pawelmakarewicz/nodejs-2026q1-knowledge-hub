import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Article } from '@prisma/client';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { CommentService } from '../comment/comment.service';

@Injectable()
export class ArticleService {
  private articles: Article[] = [];

  constructor(
    @Inject(forwardRef(() => CommentService))
    private readonly commentService: CommentService,
  ) {}

  findAll(filters?: {
    status?: string;
    categoryId?: string;
    tag?: string;
  }): Article[] {
    let result = this.articles;

    if (filters?.status) {
      result = result.filter((a) => a.status === filters.status);
    }
    if (filters?.categoryId) {
      result = result.filter((a) => a.categoryId === filters.categoryId);
    }
    if (filters?.tag) {
      result = result.filter((a) => a.tags.includes(filters.tag));
    }

    return result;
  }

  findOne(id: string): Article {
    const article = this.articles.find((a) => a.id === id);
    if (!article) {
      throw new NotFoundException(`Article with id ${id} not found`);
    }
    return article;
  }

  exists(id: string): boolean {
    return this.articles.some((a) => a.id === id);
  }

  create(dto: CreateArticleDto): Article {
    const now = Date.now();
    const article: Article = {
      id: uuidv4(),
      title: dto.title,
      content: dto.content,
      status: dto.status || 'draft',
      authorId: dto.authorId ?? null,
      categoryId: dto.categoryId ?? null,
      tags: dto.tags || [],
      createdAt: now,
      updatedAt: now,
    };
    this.articles.push(article);
    return article;
  }

  update(id: string, dto: UpdateArticleDto): Article {
    const article = this.findOne(id);

    if (dto.title !== undefined) article.title = dto.title;
    if (dto.content !== undefined) article.content = dto.content;
    if (dto.status !== undefined) article.status = dto.status;
    if (dto.authorId !== undefined) article.authorId = dto.authorId;
    if (dto.categoryId !== undefined) article.categoryId = dto.categoryId;
    if (dto.tags !== undefined) article.tags = dto.tags;
    article.updatedAt = Date.now();
    console.log(`Article with id ${id} updated`);

    return article;
  }

  remove(id: string): void {
    const index = this.articles.findIndex((a) => a.id === id);
    if (index === -1) {
      throw new NotFoundException(`Article with id ${id} not found`);
    }
    this.commentService.removeByArticleId(id);
    this.articles.splice(index, 1);
  }

  nullifyAuthorId(userId: string): void {
    this.articles.forEach((a) => {
      if (a.authorId === userId) {
        a.authorId = null;
      }
    });
  }

  nullifyCategoryId(categoryId: string): void {
    this.articles.forEach((a) => {
      if (a.categoryId === categoryId) {
        a.categoryId = null;
      }
    });
  }
}
