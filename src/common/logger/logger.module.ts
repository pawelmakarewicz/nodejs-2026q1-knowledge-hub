import { Global, Module } from '@nestjs/common';
import { AppLoggerService } from './app-logger.service';
import { FileLogWriterService } from './file-log-writer.service';

@Global()
@Module({
  providers: [AppLoggerService, FileLogWriterService],
  exports: [AppLoggerService],
})
export class LoggerModule {}
