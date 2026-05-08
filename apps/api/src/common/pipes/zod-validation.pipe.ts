import {
  type ArgumentMetadata,
  BadRequestException,
  Injectable,
  type PipeTransform,
} from '@nestjs/common';
import type { z } from 'zod';

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

/**
 * Per-route helper for type-safe parsing inside controllers.
 *
 * Returns z.infer<T> (the OUTPUT type with defaults applied) rather than the
 * input type. This matters for Zod schemas that use .default() — without this,
 * TypeScript infers parseWith's return as the optional input shape and the
 * call site fails to match service signatures that expect required fields.
 */
export function parseWith<T extends z.ZodTypeAny>(schema: T, value: unknown): z.infer<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new BadRequestException({
      error: 'ValidationError',
      issues: result.error.issues,
    });
  }
  return result.data;
}
