import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { createPrismaMock } from '../../test/unit/mocks/prisma.mock';
import { CategoryService } from './category.service';

describe('CategoryService', () => {
  let service: CategoryService;
  const prismaMock = createPrismaMock();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get(CategoryService);
  });

  it('findAll returns categories', async () => {
    prismaMock.category.findMany.mockResolvedValueOnce([{ id: 'c1', name: 'Nest' }]);

    await expect(service.findAll()).resolves.toEqual([{ id: 'c1', name: 'Nest' }]);
  });

  it('findOne throws for missing category', async () => {
    prismaMock.category.findUnique.mockResolvedValueOnce(null);

    await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('create passes dto fields to prisma', async () => {
    prismaMock.category.create.mockResolvedValueOnce({ id: 'c1' });

    await service.create({ name: 'A', description: 'B' });

    expect(prismaMock.category.create).toHaveBeenCalledWith({
      data: { name: 'A', description: 'B' },
    });
  });

  it('update checks existence and updates', async () => {
    prismaMock.category.findUnique.mockResolvedValueOnce({ id: 'c1' });
    prismaMock.category.update.mockResolvedValueOnce({ id: 'c1' });

    await service.update('c1', { name: 'new', description: 'desc' });

    expect(prismaMock.category.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { name: 'new', description: 'desc' },
    });
  });

  it('remove checks existence and deletes', async () => {
    prismaMock.category.findUnique.mockResolvedValueOnce({ id: 'c1' });
    prismaMock.category.delete.mockResolvedValueOnce(undefined);

    await service.remove('c1');

    expect(prismaMock.category.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
  });
});
