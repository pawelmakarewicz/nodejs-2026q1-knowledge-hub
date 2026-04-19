import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ParseUUIDPipe } from '../common/pipes/parse-uuid.pipe';
import { Category } from '@prisma/client';
import { ApiDoc, UUID_ERRORS, INVALID_INPUT } from '../common/decorators';

@ApiTags('Category')
@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  @ApiDoc({
    summary: 'Get all categories',
    responses: [{ status: 200, description: 'List of all categories' }],
  })
  findAll(): Promise<Category[]> {
    return this.categoryService.findAll();
  }

  @Get(':id')
  @ApiDoc({
    summary: 'Get category by id',
    responses: [{ status: 200, description: 'Category found' }, ...UUID_ERRORS],
  })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Category> {
    return this.categoryService.findOne(id);
  }

  @Post()
  @ApiDoc({
    summary: 'Create a new category',
    responses: [
      { status: 201, description: 'Category created' },
      ...INVALID_INPUT,
    ],
  })
  create(@Body() dto: CreateCategoryDto): Promise<Category> {
    return this.categoryService.create(dto);
  }

  @Put(':id')
  @ApiDoc({
    summary: 'Update a category',
    responses: [
      { status: 200, description: 'Category updated' },
      { status: 400, description: 'Invalid UUID or input data' },
      { status: 404, description: 'Category not found' },
    ],
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<Category> {
    return this.categoryService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiDoc({
    summary: 'Delete a category',
    responses: [
      { status: 204, description: 'Category deleted' },
      ...UUID_ERRORS,
    ],
  })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.categoryService.remove(id);
  }
}
