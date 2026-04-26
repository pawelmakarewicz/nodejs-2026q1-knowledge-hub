import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { createPrismaMock } from '../../test/unit/mocks/prisma.mock';
import { CommentService } from './comment.service';

describe('CommentService', () => {
  let service: CommentService;
  const prismaMock = createPrismaMock();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get(CommentService);
  });

  it('findByArticleId returns comments list', async () => {
    prismaMock.comment.findMany.mockResolvedValueOnce([{ id: 'cm1', articleId: 'a1' }]);

    await expect(service.findByArticleId('a1')).resolves.toEqual([{ id: 'cm1', articleId: 'a1' }]);
  });

  it('findOne throws when comment does not exist', async () => {
    prismaMock.comment.findUnique.mockResolvedValueOnce(null);

    await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('create throws when article is missing', async () => {
    prismaMock.article.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.create({ content: 'hi', articleId: 'a1', authorId: null }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('create stores nullable authorId', async () => {
    prismaMock.article.findUnique.mockResolvedValueOnce({ id: 'a1' });
    prismaMock.comment.create.mockResolvedValueOnce({ id: 'cm1' });

    await service.create({ content: 'hello', articleId: 'a1', authorId: null });

    expect(prismaMock.comment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ authorId: null }),
      }),
    );
  });

  it('remove checks existence and deletes', async () => {
    prismaMock.comment.findUnique.mockResolvedValueOnce({ id: 'cm1' });
    prismaMock.comment.delete.mockResolvedValueOnce(undefined);

    await service.remove('cm1');

    expect(prismaMock.comment.delete).toHaveBeenCalledWith({ where: { id: 'cm1' } });
  });
});
