import { Injectable } from '@nestjs/common';
import { appendFile, rename, stat } from 'node:fs/promises';
import { join } from 'node:path';

@Injectable()
export class FileLogWriterService {
  private readonly filePath = join(process.cwd(), 'app.log');

  async write(line: string): Promise<void> {
    try {
      await this.rotateIfNeeded(Buffer.byteLength(line));
      await appendFile(this.filePath, line, { encoding: 'utf-8' });
    } catch {
      // Best-effort file logging: stdout logging still works through Nest logger methods.
    }
  }

  private async rotateIfNeeded(nextChunkSizeInBytes: number): Promise<void> {
    const maxSizeKb = Number.parseInt(
      process.env.LOG_MAX_FILE_SIZE ?? '1024',
      10,
    );
    const maxSizeBytes =
      (Number.isFinite(maxSizeKb) && maxSizeKb > 0 ? maxSizeKb : 1024) * 1024;

    let currentSize = 0;
    try {
      const fileStats = await stat(this.filePath);
      currentSize = fileStats.size;
    } catch {
      return;
    }

    if (currentSize + nextChunkSizeInBytes <= maxSizeBytes) {
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const rotatedFilePath = join(process.cwd(), `app-${timestamp}.log`);
    await rename(this.filePath, rotatedFilePath);
  }
}
