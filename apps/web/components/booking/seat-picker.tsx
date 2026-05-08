'use client';

import { useEffect, useMemo, useState } from 'react';

import { cn, formatVnd } from '@/lib/utils';
import { disconnectSeatsSocket, getSeatsSocket } from '@/lib/realtime/socket';

export interface SeatItem {
  id: string;
  row: string;
  col: number;
  type: 'STANDARD' | 'VIP' | 'COUPLE';
  isActive: boolean;
}

export interface SeatPickerProps {
  showtimeId: string;
  userId: string;
  seats: SeatItem[];
  rowsCount: number;
  colsCount: number;
  vipRows?: string[];
  coupleRows?: string[];
  soldSeatIds: string[];
  basePriceVnd: number;
  formatMultiplier: number;
  selected: string[];
  onSelectionChange: (selectedIds: string[]) => void;
}

const TYPE_MULT = { STANDARD: 1, VIP: 1.4, COUPLE: 1.8 } as const;

export function SeatPicker({
  showtimeId,
  userId,
  seats,
  vipRows = [],
  coupleRows = [],
  soldSeatIds,
  basePriceVnd,
  formatMultiplier,
  selected,
  onSelectionChange,
}: SeatPickerProps) {
  const [lockedByOthers, setLockedByOthers] = useState<Record<string, string>>({});
  const sold = useMemo(() => new Set(soldSeatIds), [soldSeatIds]);

  const rowMap = useMemo(() => {
    const map = new Map<string, SeatItem[]>();
    for (const seat of seats) {
      const list = map.get(seat.row) ?? [];
      list.push(seat);
      map.set(seat.row, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.col - b.col);
    return map;
  }, [seats]);

  const sortedRows = useMemo(
    () => [...rowMap.keys()].sort((a, b) => a.localeCompare(b)),
    [rowMap],
  );

  useEffect(() => {
    const socket = getSeatsSocket(userId);
    socket.emit('seat.join', { showtimeId });

    socket.on('seat.snapshot', ({ seats: snapshot }: { seats: Record<string, string> }) => {
      const filtered: Record<string, string> = {};
      for (const [seatId, holder] of Object.entries(snapshot)) {
        if (holder !== userId) filtered[seatId] = holder;
      }
      setLockedByOthers(filtered);
    });

    socket.on('seat.locked', ({ seatId, userId: holder }: { seatId: string; userId: string }) => {
      if (holder !== userId) {
        setLockedByOthers((prev) => ({ ...prev, [seatId]: holder }));
      }
    });

    socket.on('seat.released', ({ seatId, seatIds }: { seatId?: string; seatIds?: string[] }) => {
      const ids = seatIds ?? (seatId ? [seatId] : []);
      setLockedByOthers((prev) => {
        const next = { ...prev };
        for (const id of ids) delete next[id];
        return next;
      });
    });

    socket.on('seat.sold', ({ seatIds }: { seatIds: string[] }) => {
      // Caller is responsible for refetching the page; we just clear our local "locked" map.
      setLockedByOthers((prev) => {
        const next = { ...prev };
        for (const id of seatIds) delete next[id];
        return next;
      });
    });

    socket.on('seat.lock_denied', ({ seatId, reason }: { seatId: string; reason: string }) => {
      onSelectionChange(selected.filter((id) => id !== seatId));
      console.warn(`seat ${seatId} lock denied: ${reason}`);
    });

    return () => {
      socket.off('seat.snapshot');
      socket.off('seat.locked');
      socket.off('seat.released');
      socket.off('seat.sold');
      socket.off('seat.lock_denied');
      disconnectSeatsSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showtimeId, userId]);

  const handleClick = (seat: SeatItem) => {
    if (sold.has(seat.id) || lockedByOthers[seat.id] || !seat.isActive) return;
    const socket = getSeatsSocket(userId);
    if (selected.includes(seat.id)) {
      socket.emit('seat.release_request', { showtimeId, seatId: seat.id });
      onSelectionChange(selected.filter((id) => id !== seat.id));
    } else {
      if (selected.length >= 8) return;
      socket.emit('seat.lock_request', { showtimeId, seatId: seat.id });
      onSelectionChange([...selected, seat.id]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Screen */}
      <div className="mx-auto max-w-3xl">
        <div className="h-2 rounded-full gradient-brand" />
        <p className="mt-2 text-center text-xs uppercase tracking-widest text-muted-foreground">
          Màn hình
        </p>
      </div>

      {/* Grid */}
      <div className="space-y-2">
        {sortedRows.map((row) => {
          const isVip = vipRows.includes(row);
          const isCouple = coupleRows.includes(row);
          const seatsInRow = rowMap.get(row) ?? [];
          return (
            <div key={row} className="flex items-center justify-center gap-1.5">
              <span className="w-6 text-right text-xs font-semibold text-muted-foreground">
                {row}
              </span>
              <div className="flex flex-wrap justify-center gap-1.5">
                {seatsInRow.map((seat) => {
                  const status = sold.has(seat.id)
                    ? 'sold'
                    : lockedByOthers[seat.id]
                      ? 'locked-other'
                      : selected.includes(seat.id)
                        ? 'selected'
                        : 'available';
                  return (
                    <button
                      key={seat.id}
                      type="button"
                      onClick={() => handleClick(seat)}
                      disabled={status === 'sold' || status === 'locked-other'}
                      className={cn(
                        'flex h-8 select-none items-center justify-center rounded-md text-[10px] font-bold transition-all',
                        isCouple ? 'w-16' : 'w-8',
                        status === 'sold' && 'cursor-not-allowed bg-muted text-muted-foreground/40',
                        status === 'locked-other' &&
                          'cursor-not-allowed bg-amber-500/40 text-white animate-pulse',
                        status === 'available' &&
                          (isVip
                            ? 'bg-purple-500/30 text-purple-200 hover:bg-purple-500/50'
                            : isCouple
                              ? 'bg-pink-500/30 text-pink-200 hover:bg-pink-500/50'
                              : 'bg-emerald-500/30 text-emerald-200 hover:bg-emerald-500/50'),
                        status === 'selected' && 'bg-brand text-white shadow-lg shadow-brand/40 scale-110',
                      )}
                    >
                      {seat.col}
                    </button>
                  );
                })}
              </div>
              <span className="w-6 text-xs font-semibold text-muted-foreground">{row}</span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 pt-4 text-xs">
        <Legend color="bg-emerald-500/30" label={`Thường ${formatVnd(basePriceVnd * formatMultiplier)}`} />
        <Legend
          color="bg-purple-500/30"
          label={`VIP ${formatVnd(basePriceVnd * TYPE_MULT.VIP * formatMultiplier)}`}
        />
        <Legend
          color="bg-pink-500/30"
          label={`Cặp đôi ${formatVnd(basePriceVnd * TYPE_MULT.COUPLE * formatMultiplier)}`}
        />
        <Legend color="bg-brand" label="Đã chọn" />
        <Legend color="bg-amber-500/40" label="Đang giữ" />
        <Legend color="bg-muted" label="Đã bán" muted />
      </div>
    </div>
  );
}

function Legend({ color, label, muted }: { color: string; label: string; muted?: boolean }) {
  return (
    <div className={cn('flex items-center gap-1.5', muted && 'text-muted-foreground')}>
      <span className={cn('h-3 w-3 rounded-sm', color)} />
      <span>{label}</span>
    </div>
  );
}
