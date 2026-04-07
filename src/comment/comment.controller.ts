import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiQuery } from '@nestjs/swagger';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ParseUUIDPipe } from '../common/pipes/parse-uuid.pipe';
import { Comment } from './entities/comment.entity';
import { ApiDoc, UUID_ERRORS, INVALID_INPUT } from '../common/decorators';

@ApiTags('Comment')
@Controller('comment')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Get()
  @ApiDoc({
    summary: 'Get comments by articleId',
    responses: [{ status: 200, description: 'List of comments' }],
  })
  @ApiQuery({ name: 'articleId', required: false })
  findByArticle(@Query('articleId') articleId?: string): Comment[] {
    if (articleId) {
      return this.commentService.findByArticleId(articleId);
    }
    return [];
  }

  @Get(':id')
  @ApiDoc({
    summary: 'Get comment by id',
    responses: [{ status: 200, description: 'Comment found' }, ...UUID_ERRORS],
  })
  findOne(@Param('id', ParseUUIDPipe) id: string): Comment {
    return this.commentService.findOne(id);
  }

  @Post()
  @ApiDoc({
    summary: 'Create a new comment',
    responses: [
      { status: 201, description: 'Comment created' },
      ...INVALID_INPUT,
      { status: 422, description: 'Article not found' },
    ],
  })
  create(@Body() dto: CreateCommentDto): Comment {
    return this.commentService.create(dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiDoc({
    summary: 'Delete a comment',
    responses: [
      { status: 204, description: 'Comment deleted' },
      ...UUID_ERRORS,
    ],
  })
  remove(@Param('id', ParseUUIDPipe) id: string): void {
    return this.commentService.remove(id);
  }
}
