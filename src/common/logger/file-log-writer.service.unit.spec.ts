const { appendFileMock, renameMock, statMock } = vi.hoisted(() => ({
  appendFileMock: vi.fn(),
  renameMock: vi.fn(),
  statMock: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
  appendFile: appendFileMock,
  rename: renameMock,
  stat: statMock,
}));

import { FileLogWriterService } from './file-log-writer.service';

describe('FileLogWriterService', () => {
  beforeEach(() => {
    appendFileMock.mockReset();
    renameMock.mockReset();
    statMock.mockReset();
    process.env.LOG_MAX_FILE_SIZE = '1';
  });

  it('appends directly when file does not exist yet', async () => {
    statMock.mockRejectedValueOnce(new Error('ENOENT'));
    const writer = new FileLogWriterService();

    await writer.write('hello\n');

    expect(renameMock).not.toHaveBeenCalled();
    expect(appendFileMock).toHaveBeenCalledTimes(1);
  });

  it('rotates when size exceeds configured limit', async () => {
    statMock.mockResolvedValueOnce({ size: 1100 });
    const writer = new FileLogWriterService();

    await writer.write('line\n');

    expect(renameMock).toHaveBeenCalledTimes(1);
    expect(appendFileMock).toHaveBeenCalledTimes(1);
  });

  it('does not rotate when below configured limit', async () => {
    statMock.mockResolvedValueOnce({ size: 20 });
    const writer = new FileLogWriterService();

    await writer.write('line\n');

    expect(renameMock).not.toHaveBeenCalled();
    expect(appendFileMock).toHaveBeenCalledTimes(1);
  });
});
