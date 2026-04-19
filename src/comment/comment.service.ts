import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Comment } from './entities/comment.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ArticleService } from '../article/article.service';

@Injectable()
export class CommentService {
  private comments: Comment[] = [];

  constructor(
    @Inject(forwardRef(() => ArticleService))
    private readonly articleService: ArticleService,
  ) {}

  findByArticleId(articleId: string): Comment[] {
    return this.comments.filter((c) => c.articleId === articleId);
  }

  findOne(id: string): Comment {
    const comment = this.comments.find((c) => c.id === id);
    if (!comment) {
      throw new NotFoundException(`Comment with id ${id} not found`);
    }
    return comment;
  }

  create(dto: CreateCommentDto): Comment {
    if (!this.articleService.exists(dto.articleId)) {
      throw new UnprocessableEntityException(
        `Article with id ${dto.articleId} not found`,
      );
    }

    const comment: Comment = {
      id: uuidv4(),
      content: dto.content,
      articleId: dto.articleId,
      authorId: dto.authorId ?? null,
      createdAt: Date.now(),
    };
    this.comments.push(comment);
    return comment;
  }

  remove(id: string): void {
    const index = this.comments.findIndex((c) => c.id === id);
    if (index === -1) {
      throw new NotFoundException(`Comment with id ${id} not found`);
    }
    this.comments.splice(index, 1);
  }

  removeByArticleId(articleId: string): void {
    this.comments = this.comments.filter((c) => c.articleId !== articleId);
  }

  removeByAuthorId(authorId: string): void {
    this.comments = this.comments.filter((c) => c.authorId !== authorId);
  }
}
