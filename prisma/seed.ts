import 'dotenv/config';
import { PrismaClient, UserRole, ArticleStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  // Clear existing data in dependency order
  await prisma.comment.deleteMany();
  await prisma.article.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  const admin = await prisma.user.create({
    data: {
      login: 'admin',
      password: 'admin_password_123',
      role: UserRole.ADMIN,
    },
  });

  const editor = await prisma.user.create({
    data: {
      login: 'editor',
      password: 'editor_password_456',
      role: UserRole.EDITOR,
    },
  });

  // Create categories
  const techCategory = await prisma.category.create({
    data: {
      name: 'Technology',
      description: 'Articles about technology and innovation',
    },
  });

  const scienceCategory = await prisma.category.create({
    data: {
      name: 'Science',
      description: 'Articles about science and research',
    },
  });

  const programmingCategory = await prisma.category.create({
    data: {
      name: 'Programming',
      description: 'Articles about software development and best practices',
    },
  });

  // Create tags
  await Promise.all([
    prisma.tag.create({ data: { name: 'nestjs' } }),
    prisma.tag.create({ data: { name: 'typescript' } }),
    prisma.tag.create({ data: { name: 'postgresql' } }),
    prisma.tag.create({ data: { name: 'nodejs' } }),
    prisma.tag.create({ data: { name: 'prisma' } }),
  ]);

  // Create articles with different statuses and tags via connectOrCreate
  const article1 = await prisma.article.create({
    data: {
      title: 'Getting Started with NestJS',
      content:
        'NestJS is a progressive Node.js framework for building efficient, reliable, and scalable server-side applications.',
      status: ArticleStatus.PUBLISHED,
      authorId: editor.id,
      categoryId: programmingCategory.id,
      tags: {
        connectOrCreate: [
          { where: { name: 'nestjs' }, create: { name: 'nestjs' } },
          { where: { name: 'typescript' }, create: { name: 'typescript' } },
          { where: { name: 'nodejs' }, create: { name: 'nodejs' } },
        ],
      },
    },
  });

  const article2 = await prisma.article.create({
    data: {
      title: 'PostgreSQL Performance Tuning',
      content:
        'Learn how to optimize your PostgreSQL database for production workloads with indexing and query optimization.',
      status: ArticleStatus.PUBLISHED,
      authorId: admin.id,
      categoryId: techCategory.id,
      tags: {
        connectOrCreate: [
          { where: { name: 'postgresql' }, create: { name: 'postgresql' } },
          { where: { name: 'prisma' }, create: { name: 'prisma' } },
        ],
      },
    },
  });

  const article3 = await prisma.article.create({
    data: {
      title: 'Introduction to Prisma ORM',
      content:
        'Prisma is a next-generation ORM that makes database access easy with type-safe queries and automatic migrations.',
      status: ArticleStatus.DRAFT,
      authorId: editor.id,
      categoryId: programmingCategory.id,
      tags: {
        connectOrCreate: [
          { where: { name: 'prisma' }, create: { name: 'prisma' } },
          { where: { name: 'typescript' }, create: { name: 'typescript' } },
          { where: { name: 'postgresql' }, create: { name: 'postgresql' } },
        ],
      },
    },
  });

  const article4 = await prisma.article.create({
    data: {
      title: 'The Future of AI in Scientific Research',
      content:
        'Artificial intelligence is transforming scientific research, enabling faster discovery and more accurate predictions.',
      status: ArticleStatus.PUBLISHED,
      authorId: admin.id,
      categoryId: scienceCategory.id,
      tags: {
        connectOrCreate: [
          { where: { name: 'nodejs' }, create: { name: 'nodejs' } },
        ],
      },
    },
  });

  const article5 = await prisma.article.create({
    data: {
      title: 'TypeScript Advanced Types Deep Dive',
      content:
        'Explore conditional types, mapped types, template literal types, and other advanced TypeScript features.',
      status: ArticleStatus.ARCHIVED,
      authorId: editor.id,
      categoryId: programmingCategory.id,
      tags: {
        connectOrCreate: [
          { where: { name: 'typescript' }, create: { name: 'typescript' } },
          { where: { name: 'nodejs' }, create: { name: 'nodejs' } },
        ],
      },
    },
  });

  // Create comments
  await prisma.comment.create({
    data: {
      content: 'Great article! Very helpful for beginners getting into NestJS.',
      articleId: article1.id,
      authorId: admin.id,
    },
  });

  await prisma.comment.create({
    data: {
      content: 'The indexing tips here saved my query times significantly.',
      articleId: article2.id,
      authorId: editor.id,
    },
  });

  await prisma.comment.create({
    data: {
      content:
        'Looking forward to the published version of this Prisma article.',
      articleId: article3.id,
      authorId: admin.id,
    },
  });

  console.log('Seed completed successfully!');
  console.log(`Created: 2 users, 3 categories, 5 tags, 5 articles, 3 comments`);
  console.log(
    `  Articles: ${article1.id}, ${article2.id}, ${article3.id}, ${article4.id}, ${article5.id}`,
  );
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
