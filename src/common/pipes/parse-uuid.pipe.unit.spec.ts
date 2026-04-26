import { BadRequestException } from '@nestjs/common';
import { ParseUUIDPipe } from './parse-uuid.pipe';

describe('ParseUUIDPipe', () => {
  const pipe = new ParseUUIDPipe();

  it('passes a valid UUID as-is', () => {
    const value = '550e8400-e29b-41d4-a716-446655440000';
    expect(pipe.transform(value)).toBe(value);
  });

  it('throws for malformed UUID', () => {
    expect(() => pipe.transform('abc-not-uuid')).toThrow(BadRequestException);
  });

  it('throws for empty value', () => {
    expect(() => pipe.transform('')).toThrow(BadRequestException);
  });
});
