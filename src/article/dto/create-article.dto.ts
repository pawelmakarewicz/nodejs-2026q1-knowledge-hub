import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArticleStatus } from '@prisma/client';

export class CreateArticleDto {
  @ApiProperty({ example: 'My Article' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Article content here' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ enum: ArticleStatus, example: 'DRAFT' })
  @IsOptional()
  @IsEnum(ArticleStatus)
  status?: ArticleStatus;

  @ApiPropertyOptional({ example: null })
  @IsOptional()
  @IsString()
  authorId?: string | null;

  @ApiPropertyOptional({ example: null })
  @IsOptional()
  @IsString()
  categoryId?: string | null;

  @ApiPropertyOptional({ example: ['nestjs', 'typescript'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
