import { type ArgumentMetadata, BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';
import { type ZodSchema } from 'zod';

/**
 * Bridges Zod schemas into Nest's ValidationPipe pipeline. Use as a method-level pipe,
 * not as a global one — the global ValidationPipe handles class-validator DTOs.
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  transform(value: unknown, _metadata: ArgumentMetadata) {
    return value;
  }
}

/** Per-route helper for typing safe parsing inside controllers. */
export function parseWith<T>(schema: ZodSchema<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new BadRequestException({
      error: 'ValidationError',
      issues: result.error.issues,
    });
  }
  return result.data;
}
