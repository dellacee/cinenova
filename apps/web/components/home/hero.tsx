'use client';

import { motion } from 'framer-motion';
import { Play, Sparkles } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-brand/10 via-transparent to-purple-500/10" />
      <div
        className="absolute inset-0 -z-10 opacity-30"
        style={{
          backgroundImage:
            'radial-gradient(circle at 25% 25%, rgba(255, 59, 48, 0.4) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(124, 58, 237, 0.3) 0%, transparent 50%)',
        }}
      />

      <div className="container relative grid gap-12 py-20 md:py-32 lg:grid-cols-2 lg:py-40">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col justify-center"
        >
          <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-4 py-1.5 text-xs font-medium text-brand-500">
            <Sparkles className="h-3.5 w-3.5" />
            AI-powered movie booking
          </div>

          <h1 className="font-display text-5xl font-bold leading-tight tracking-tight md:text-6xl lg:text-7xl">
            Where every seat <br />
            <span className="text-gradient-brand">tells a story.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Browse showtimes across the country, pick your seat in real-time, get smart recommendations
            from an AI that actually knows the catalog.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-brand hover:bg-brand-600">
              <Link href="/movies?status=NOW_SHOWING">
                <Play className="h-4 w-4" />
                Đặt vé ngay
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/movies?status=COMING_SOON">Phim sắp chiếu</Link>
            </Button>
          </div>

          <div className="mt-12 grid grid-cols-3 gap-8 border-t border-border/40 pt-8">
            <Stat label="Phim đang chiếu" value="30+" />
            <Stat label="Rạp toàn quốc" value="5" />
            <Stat label="Suất chiếu/tuần" value="200+" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative hidden lg:block"
        >
          <div className="relative aspect-square w-full max-w-md mx-auto">
            <div className="absolute inset-0 rounded-3xl gradient-brand opacity-20 blur-3xl" />
            <div className="relative rounded-3xl border border-border/50 bg-card/50 p-8 backdrop-blur-xl">
              <div className="grid grid-cols-8 gap-1.5">
                {Array.from({ length: 64 }).map((_, i) => {
                  const isAisle = i % 8 === 3;
                  const isVip = Math.floor(i / 8) >= 4 && Math.floor(i / 8) <= 5;
                  const isSold = [5, 12, 19, 20, 27, 35, 42, 50].includes(i);
                  const isLocked = [13, 21, 36].includes(i);
                  return (
                    <div
                      key={i}
                      className={`aspect-square rounded ${
                        isAisle
                          ? 'opacity-0'
                          : isSold
                            ? 'bg-muted-foreground/30'
                            : isLocked
                              ? 'bg-amber-500/60 animate-pulse'
                              : isVip
                                ? 'bg-purple-500/40'
                                : 'bg-emerald-500/30'
                      }`}
                    />
                  );
                })}
              </div>
              <div className="mt-6 h-2 rounded-full gradient-brand" />
              <p className="mt-2 text-center text-xs text-muted-foreground">Màn hình</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-display text-3xl font-bold">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
