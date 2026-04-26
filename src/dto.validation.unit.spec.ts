import { ArticleStatus, UserRole } from '@prisma/client';
import { validate } from 'class-validator';
import { CreateArticleDto } from './article/dto/create-article.dto';
import { UpdateArticleDto } from './article/dto/update-article.dto';
import { LoginDto } from './auth/dto/login.dto';
import { SignupDto } from './auth/dto/signup.dto';
import { CreateUserDto } from './user/dto/create-user.dto';

describe('DTO Validation', () => {
  it('CreateUserDto fails on missing required fields', async () => {
    const dto = new CreateUserDto();
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('CreateUserDto fails for invalid role enum', async () => {
    const dto = Object.assign(new CreateUserDto(), {
      login: 'john',
      password: 'pwd',
      role: 'SUPERADMIN',
    });

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'role')).toBe(true);
  });

  it('CreateUserDto passes for valid payload', async () => {
    const dto = Object.assign(new CreateUserDto(), {
      login: 'john',
      password: 'pwd',
      role: UserRole.VIEWER,
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('CreateArticleDto fails for missing fields and invalid status', async () => {
    const missing = new CreateArticleDto();
    expect((await validate(missing)).length).toBeGreaterThan(0);

    const wrongStatus = Object.assign(new CreateArticleDto(), {
      title: 'T',
      content: 'C',
      status: 'BROKEN',
    });
    const statusErrors = await validate(wrongStatus);
    expect(statusErrors.some((e) => e.property === 'status')).toBe(true);
  });

  it('CreateArticleDto passes for valid payload', async () => {
    const dto = Object.assign(new CreateArticleDto(), {
      title: 'T',
      content: 'C',
      status: ArticleStatus.DRAFT,
      tags: ['nestjs', 'vitest'],
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('UpdateArticleDto fails for invalid enum and non-string tag item', async () => {
    const invalidStatus = Object.assign(new UpdateArticleDto(), {
      status: 'INVALID',
    });
    const statusErrors = await validate(invalidStatus);
    expect(statusErrors.some((e) => e.property === 'status')).toBe(true);

    const invalidTags = Object.assign(new UpdateArticleDto(), {
      tags: ['ok', 123 as unknown as string],
    });
    const tagsErrors = await validate(invalidTags);
    expect(tagsErrors.some((e) => e.property === 'tags')).toBe(true);
  });

  it('LoginDto and SignupDto validate required fields', async () => {
    const loginMissing = new LoginDto();
    const signupMissing = new SignupDto();

    expect((await validate(loginMissing)).length).toBeGreaterThan(0);
    expect((await validate(signupMissing)).length).toBeGreaterThan(0);

    const loginValid = Object.assign(new LoginDto(), {
      login: 'john',
      password: 'pwd',
    });
    const signupValid = Object.assign(new SignupDto(), {
      login: 'jane',
      password: 'pwd',
    });

    expect(await validate(loginValid)).toHaveLength(0);
    expect(await validate(signupValid)).toHaveLength(0);
  });
});
