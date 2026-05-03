import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';
import { AppLoggerService } from '../logger/app-logger.service';
import { NotFoundError } from '../errors/not-found.error';

describe('GlobalExceptionFilter', () => {
  const loggerMock = {
    error: vi.fn(),
  } as unknown as AppLoggerService;

  const responseMock = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  };

  const requestMock = {
    method: 'POST',
    originalUrl: '/auth/login',
    query: { token: 'abc' },
    body: { password: 'secret' },
  };

  const hostMock = {
    switchToHttp: () => ({
      getResponse: () => responseMock,
      getRequest: () => requestMock,
    }),
  } as ArgumentsHost;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps custom AppError descendants to their status code', () => {
    const filter = new GlobalExceptionFilter(loggerMock);

    filter.catch(new NotFoundError('missing'), hostMock);

    expect(responseMock.status).toHaveBeenCalledWith(404);
    expect(responseMock.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        message: 'missing',
      }),
    );
  });

  it('keeps known HttpException status and message', () => {
    const filter = new GlobalExceptionFilter(loggerMock);
    const exception = new HttpException(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Bad request body',
        error: 'Bad Request',
      },
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(exception, hostMock);

    expect(responseMock.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(responseMock.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.BAD_REQUEST,
      error: 'Bad Request',
      message: 'Bad request body',
    });
  });

  it('returns fallback payload for unknown errors', () => {
    const filter = new GlobalExceptionFilter(loggerMock);

    filter.catch(new Error('boom'), hostMock);

    expect(responseMock.status).toHaveBeenCalledWith(500);
    expect(responseMock.json).toHaveBeenCalledWith({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
    expect(loggerMock.error).toHaveBeenCalled();
  });
});
