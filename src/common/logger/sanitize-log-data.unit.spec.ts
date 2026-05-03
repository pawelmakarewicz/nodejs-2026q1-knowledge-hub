import { sanitizeLogData } from './sanitize-log-data';

describe('sanitizeLogData', () => {
  it('redacts password and token keys recursively', () => {
    const value = {
      login: 'john',
      password: 'secret',
      nested: {
        accessToken: 'jwt',
        profile: {
          refreshToken: 'ref',
        },
      },
    };

    expect(sanitizeLogData(value)).toEqual({
      login: 'john',
      password: '[REDACTED]',
      nested: {
        accessToken: '[REDACTED]',
        profile: {
          refreshToken: '[REDACTED]',
        },
      },
    });
  });

  it('redacts authorization/token keys inside arrays', () => {
    const value = [{ token: 'a' }, { authorization: 'Bearer x' }];

    expect(sanitizeLogData(value)).toEqual([
      { token: '[REDACTED]' },
      { authorization: '[REDACTED]' },
    ]);
  });

  it('handles circular references without throwing', () => {
    const value: Record<string, unknown> = { id: '1', password: 'secret' };
    value.self = value;

    expect(sanitizeLogData(value)).toEqual({
      id: '1',
      password: '[REDACTED]',
      self: '[Circular]',
    });
  });
});
