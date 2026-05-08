import { Injectable, NotFoundException } from '@nestjs/common';

import {
  type CreateMovieRequest,
  type MoviesQuery,
  type UpdateMovieRequest,
} from '@cinenova/shared';

import { PrismaService } from '../../infra/prisma/prisma.service.js';

const SLUG_RE = /[^a-z0-9]+/g;
function slugify(s: string): string {
  return s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(SLUG_RE, '-').replace(/^-+|-+$/g, '');
}

@Injectable()
export class MoviesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: MoviesQuery) {
    const where = {
      deletedAt: null,
      ...(q.status ? { status: q.status } : {}),
      ...(q.search
        ? {
            OR: [
              { title: { contains: q.search, mode: 'insensitive' as const } },
              { originalTitle: { contains: q.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(q.genre ? { genres: { some: { genre: { slug: q.genre } } } } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.movie.findMany({
        where,
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        orderBy: [{ status: 'asc' }, { popularity: 'desc' }],
        include: { genres: { include: { genre: true } } },
      }),
      this.prisma.movie.count({ where }),
    ]);

    return {
      data: items.map(this.toDto),
      meta: { page: q.page, limit: q.limit, total, totalPages: Math.ceil(total / q.limit) },
    };
  }

  async getBySlug(slug: string) {
    const movie = await this.prisma.movie.findFirst({
      where: { slug, deletedAt: null },
      include: { genres: { include: { genre: true } }, reviewSummary: true },
    });
    if (!movie) throw new NotFoundException(`Movie '${slug}' not found`);
    return this.toDto(movie);
  }

  async getById(id: string) {
    const movie = await this.prisma.movie.findFirst({
      where: { id, deletedAt: null },
      include: { genres: { include: { genre: true } } },
    });
    if (!movie) throw new NotFoundException(`Movie '${id}' not found`);
    return this.toDto(movie);
  }

  async create(input: CreateMovieRequest) {
    const slug = `${slugify(input.title)}-${Date.now()}`;
    const movie = await this.prisma.movie.create({
      data: {
        tmdbId: input.tmdbId ?? Math.floor(Math.random() * 1_000_000_000),
        slug,
        title: input.title,
        originalTitle: input.originalTitle ?? null,
        overview: input.overview,
        posterUrl: input.posterUrl ?? null,
        backdropUrl: input.backdropUrl ?? null,
        trailerYoutubeId: input.trailerYoutubeId ?? null,
        runtimeMin: input.runtimeMin,
        releaseDate: new Date(input.releaseDate),
        ageRating: input.ageRating,
        status: input.status,
        language: input.language,
        genres: { create: input.genreIds.map((id) => ({ genre: { connect: { id } } })) },
      },
      include: { genres: { include: { genre: true } } },
    });
    return this.toDto(movie);
  }

  async update(id: string, input: UpdateMovieRequest) {
    const existing = await this.prisma.movie.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) throw new NotFoundException(`Movie '${id}' not found`);

    const updated = await this.prisma.$transaction(async (tx) => {
      if (input.genreIds) {
        await tx.movieGenre.deleteMany({ where: { movieId: id } });
        await tx.movieGenre.createMany({
          data: input.genreIds.map((genreId) => ({ movieId: id, genreId })),
        });
      }

      return tx.movie.update({
        where: { id },
        data: {
          ...(input.title ? { title: input.title } : {}),
          ...(input.originalTitle !== undefined ? { originalTitle: input.originalTitle } : {}),
          ...(input.overview ? { overview: input.overview } : {}),
          ...(input.posterUrl !== undefined ? { posterUrl: input.posterUrl } : {}),
          ...(input.backdropUrl !== undefined ? { backdropUrl: input.backdropUrl } : {}),
          ...(input.trailerYoutubeId !== undefined ? { trailerYoutubeId: input.trailerYoutubeId } : {}),
          ...(input.runtimeMin ? { runtimeMin: input.runtimeMin } : {}),
          ...(input.releaseDate ? { releaseDate: new Date(input.releaseDate) } : {}),
          ...(input.ageRating ? { ageRating: input.ageRating } : {}),
          ...(input.status ? { status: input.status } : {}),
          ...(input.language ? { language: input.language } : {}),
        },
        include: { genres: { include: { genre: true } } },
      });
    });

    return this.toDto(updated);
  }

  async softDelete(id: string) {
    const existing = await this.prisma.movie.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) throw new NotFoundException(`Movie '${id}' not found`);
    await this.prisma.movie.update({ where: { id }, data: { deletedAt: new Date() } });
    return { id, deleted: true };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toDto = (m: any) => ({
    id: m.id,
    tmdbId: m.tmdbId,
    slug: m.slug,
    title: m.title,
    originalTitle: m.originalTitle,
    overview: m.overview,
    posterUrl: m.posterUrl,
    backdropUrl: m.backdropUrl,
    trailerYoutubeId: m.trailerYoutubeId,
    runtimeMin: m.runtimeMin,
    releaseDate: m.releaseDate.toISOString(),
    ageRating: m.ageRating,
    status: m.status,
    voteAverage: m.voteAverage,
    voteCount: m.voteCount,
    language: m.language,
    genres: (m.genres ?? []).map((g: { genre: { id: number; name: string; slug: string } }) => g.genre),
  });
}
