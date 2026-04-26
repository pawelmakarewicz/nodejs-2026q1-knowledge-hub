import { AppError } from './app-error';
import { ForbiddenError } from './forbidden.error';
import { NotFoundError } from './not-found.error';
import { UnauthorizedError } from './unauthorized.error';
import { ValidationError } from './validation.error';

describe('Custom errors', () => {
  it('base AppError keeps statusCode and message', () => {
    const error = new AppError('oops', 418);

    expect(error).toBeInstanceOf(Error);
    expect(error.statusCode).toBe(418);
    expect(error.message).toBe('oops');
  });

  it('NotFoundError maps to 404', () => {
    const error = new NotFoundError('entity missing');

    expect(error.statusCode).toBe(404);
    expect(error.message).toBe('entity missing');
  });

  it('ValidationError maps to 400', () => {
    const error = new ValidationError('bad payload');

    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('bad payload');
  });

  it('UnauthorizedError maps to 401', () => {
    const error = new UnauthorizedError('missing token');

    expect(error.statusCode).toBe(401);
    expect(error.message).toBe('missing token');
  });

  it('ForbiddenError maps to 403', () => {
    const error = new ForbiddenError('denied');

    expect(error.statusCode).toBe(403);
    expect(error.message).toBe('denied');
  });
});
