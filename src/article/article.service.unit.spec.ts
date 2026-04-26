import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ArticleStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { createPrismaMock } from '../../test/unit/mocks/prisma.mock';
import { ArticleService } from './article.service';

describe('ArticleService', () => {
  let service: ArticleService;
  const prismaMock = createPrismaMock();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticleService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get(ArticleService);
  });

  it('findAll supports status/category/tag filters', async () => {
    prismaMock.article.findMany.mockResolvedValueOnce([]);
    await service.findAll({ status: ArticleStatus.DRAFT });
    expect(prismaMock.article.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: ArticleStatus.DRAFT }) }),
    );

    prismaMock.article.findMany.mockResolvedValueOnce([]);
    await service.findAll({ categoryId: 'cat-1' });
    expect(prismaMock.article.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ categoryId: 'cat-1' }) }),
    );

    prismaMock.article.findMany.mockResolvedValueOnce([]);
    await service.findAll({ tag: 'nestjs' });
    expect(prismaMock.article.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tags: { some: { name: 'nestjs' } } }),
      }),
    );
  });

  it('findOne throws when article does not exist', async () => {
    prismaMock.article.findUnique.mockResolvedValueOnce(null);

    await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('exists returns false/true based on lookup result', async () => {
    prismaMock.article.findUnique.mockResolvedValueOnce(null);
    await expect(service.exists('a1')).resolves.toBe(false);

    prismaMock.article.findUnique.mockResolvedValueOnce({ id: 'a1' });
    await expect(service.exists('a1')).resolves.toBe(true);
  });

  it('create manages tags with connectOrCreate', async () => {
    prismaMock.article.create.mockResolvedValueOnce({ id: 'a1' });

    await service.create({
      title: 'Title',
      content: 'Content',
      status: ArticleStatus.DRAFT,
      authorId: null,
      categoryId: null,
      tags: ['nestjs', 'testing'],
    });

    expect(prismaMock.article.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tags: {
            connectOrCreate: [
              { where: { name: 'nestjs' }, create: { name: 'nestjs' } },
              { where: { name: 'testing' }, create: { name: 'testing' } },
            ],
          },
        }),
      }),
    );
  });

  it('allows valid status transitions', async () => {
    prismaMock.article.findUnique.mockResolvedValueOnce({
      id: 'a1',
      status: ArticleStatus.DRAFT,
      tags: [],
    });
    prismaMock.article.update.mockResolvedValueOnce({
      id: 'a1',
      status: ArticleStatus.PUBLISHED,
    });

    await service.update('a1', { status: ArticleStatus.PUBLISHED });

    expect(prismaMock.article.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: ArticleStatus.PUBLISHED }) }),
    );
  });

  it('rejects invalid status transitions', async () => {
    prismaMock.article.findUnique.mockResolvedValueOnce({
      id: 'a1',
      status: ArticleStatus.ARCHIVED,
      tags: [],
    });

    await expect(
      service.update('a1', { status: ArticleStatus.PUBLISHED }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updates tags with full replacement when dto.tags is provided', async () => {
    prismaMock.article.findUnique.mockResolvedValueOnce({
      id: 'a1',
      status: ArticleStatus.PUBLISHED,
      tags: [],
    });
    prismaMock.article.update.mockResolvedValueOnce({ id: 'a1' });

    await service.update('a1', { tags: ['a', 'b'] });

    expect(prismaMock.article.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tags: {
            set: [],
            connectOrCreate: [
              { where: { name: 'a' }, create: { name: 'a' } },
              { where: { name: 'b' }, create: { name: 'b' } },
            ],
          },
        }),
      }),
    );
  });

  it('remove checks existence before delete', async () => {
    prismaMock.article.findUnique.mockResolvedValueOnce({
      id: 'a1',
      status: ArticleStatus.DRAFT,
      tags: [],
    });
    prismaMock.article.delete.mockResolvedValueOnce(undefined);

    await service.remove('a1');

    expect(prismaMock.article.delete).toHaveBeenCalledWith({ where: { id: 'a1' } });
  });
});
