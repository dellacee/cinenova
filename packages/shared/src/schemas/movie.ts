import { z } from 'zod';

export const MovieStatus = z.enum(['COMING_SOON', 'NOW_SHOWING', 'ARCHIVED']);
export const AgeRating = z.enum(['P', 'K', 'T13', 'T16', 'T18', 'C']);

export const Movie = z.object({
  id: z.string(),
  tmdbId: z.number().int(),
  slug: z.string(),
  title: z.string(),
  originalTitle: z.string().nullable(),
  overview: z.string(),
  posterUrl: z.string().nullable(),
  backdropUrl: z.string().nullable(),
  trailerYoutubeId: z.string().nullable(),
  runtimeMin: z.number().int(),
  releaseDate: z.string(),
  ageRating: AgeRating,
  status: MovieStatus,
  voteAverage: z.number().nullable(),
  voteCount: z.number().int().nullable(),
  language: z.string(),
  genres: z.array(z.object({ id: z.number().int(), name: z.string(), slug: z.string() })),
});
export type Movie = z.infer<typeof Movie>;

export const MoviesQuery = z.object({
  status: MovieStatus.optional(),
  genre: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type MoviesQuery = z.infer<typeof MoviesQuery>;

export const CreateMovieRequest = z.object({
  tmdbId: z.number().int().optional(),
  title: z.string().min(1).max(200),
  originalTitle: z.string().max(200).nullish(),
  overview: z.string().min(1),
  posterUrl: z.string().url().nullish(),
  backdropUrl: z.string().url().nullish(),
  trailerYoutubeId: z.string().max(20).nullish(),
  runtimeMin: z.number().int().min(1).max(600),
  releaseDate: z.string().datetime(),
  ageRating: AgeRating.default('T13'),
  status: MovieStatus.default('COMING_SOON'),
  language: z.string().default('vi'),
  genreIds: z.array(z.number().int()).default([]),
});
export type CreateMovieRequest = z.infer<typeof CreateMovieRequest>;

export const UpdateMovieRequest = CreateMovieRequest.partial();
export type UpdateMovieRequest = z.infer<typeof UpdateMovieRequest>;
