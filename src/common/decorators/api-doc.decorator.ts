import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

interface ApiResponseItem {
  status: number;
  description: string;
}

interface ApiDocOptions {
  summary?: string;
  responses?: ApiResponseItem[];
}

export const UUID_ERRORS: ApiResponseItem[] = [
  { status: 400, description: 'Invalid UUID' },
  { status: 404, description: 'Not found' },
];

export const INVALID_INPUT: ApiResponseItem[] = [
  { status: 400, description: 'Invalid input data' },
];

export function ApiDoc(options: ApiDocOptions = {}) {
  const decorators: (ClassDecorator | MethodDecorator | PropertyDecorator)[] =
    [];

  if (options.summary) {
    decorators.push(ApiOperation({ summary: options.summary }));
  }

  if (options.responses) {
    decorators.push(...options.responses.map((r) => ApiResponse(r)));
  }

  return applyDecorators(...decorators);
}
