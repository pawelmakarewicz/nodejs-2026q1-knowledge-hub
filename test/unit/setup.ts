import { afterEach } from 'vitest';

afterEach(() => {
  vi.resetAllMocks();
  vi.restoreAllMocks();
});
