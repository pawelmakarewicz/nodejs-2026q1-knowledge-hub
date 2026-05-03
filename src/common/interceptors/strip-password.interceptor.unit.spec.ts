import { of, firstValueFrom } from 'rxjs';
import { StripPasswordInterceptor } from './strip-password.interceptor';

describe('StripPasswordInterceptor', () => {
  const interceptor = new StripPasswordInterceptor();

  it('removes password from single object', async () => {
    const result = await firstValueFrom(
      interceptor.intercept({} as any, {
        handle: () => of({ id: 'u1', login: 'john', password: 'secret' }),
      }),
    );

    expect(result).toEqual({ id: 'u1', login: 'john' });
  });

  it('removes password from arrays', async () => {
    const result = await firstValueFrom(
      interceptor.intercept({} as any, {
        handle: () =>
          of([
            { id: 'u1', password: 'a' },
            { id: 'u2', password: 'b', profile: { password: 'nested' } },
          ]),
      }),
    );

    expect(result).toEqual([{ id: 'u1' }, { id: 'u2', profile: {} }]);
  });

  it('keeps object unchanged when password field does not exist', async () => {
    const payload = { ok: true, profile: { id: 'p1' } };

    const result = await firstValueFrom(
      interceptor.intercept({} as any, {
        handle: () => of(payload),
      }),
    );

    expect(result).toEqual(payload);
  });
});
