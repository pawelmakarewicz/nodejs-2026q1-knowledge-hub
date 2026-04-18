import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiQuery } from '@nestjs/swagger';
import { ArticleService } from './article.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { ParseUUIDPipe } from '../common/pipes/parse-uuid.pipe';
import { Article } from '@prisma/client';
import { ApiDoc, UUID_ERRORS, INVALID_INPUT } from '../common/decorators';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Article')
@Controller('article')
export class ArticleController {
  constructor(private readonly articleService: ArticleService) {}

  @Get()
  @ApiDoc({
    summary: 'Get all articles with optional filters',
    responses: [{ status: 200, description: 'List of articles' }],
  })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'tag', required: false })
  findAll(
    @Query('status') status?: string,
    @Query('categoryId') categoryId?: string,
    @Query('tag') tag?: string,
  ): Promise<Article[]> {
    return this.articleService.findAll({ status, categoryId, tag });
  }

  @Get(':id')
  @ApiDoc({
    summary: 'Get article by id',
    responses: [{ status: 200, description: 'Article found' }, ...UUID_ERRORS],
  })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Article> {
    return this.articleService.findOne(id);
  }

  @Post()
  @ApiDoc({
    summary: 'Create a new article',
    responses: [{ status: 201, description: 'Article created' }, ...INVALID_INPUT],
  })
  create(@Body() dto: CreateArticleDto): Promise<Article> {
    return this.articleService.create(dto);
  }

  @Put(':id')
  @ApiDoc({
    summary: 'Update an article',
    responses: [
      { status: 200, description: 'Article updated' },
      { status: 400, description: 'Invalid UUID or input data' },
      { status: 404, description: 'Article not found' },
    ],
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateArticleDto,
  ): Promise<Article> {
    return this.articleService.update(id, dto);
  }

  @Roles('admin')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiDoc({
    summary: 'Delete an article',
    responses: [{ status: 204, description: 'Article deleted' }, ...UUID_ERRORS],
  })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.articleService.remove(id);
  }
}
