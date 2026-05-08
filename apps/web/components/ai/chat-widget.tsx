'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Send, Sparkles, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { streamChat } from '@/lib/ai/sse';
import { useAuthStore } from '@/lib/auth-store';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const STARTERS = [
  'Phim hay nhất tuần này?',
  'Có phim hành động nào tối nay không?',
  'Phim phù hợp cho gia đình có trẻ nhỏ?',
  'Suất chiếu IMAX gần nhất ở đâu?',
];

export function ChatWidget() {
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = async (q: string) => {
    if (!q.trim() || streaming) return;
    const userMsg: Message = { role: 'user', content: q };
    const assistantMsg: Message = { role: 'assistant', content: '' };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput('');
    setStreaming(true);

    try {
      await streamChat({
        query: q,
        userId: user?.id,
        history: messages,
        onChunk: (text) => {
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && last.role === 'assistant') {
              next[next.length - 1] = { ...last, content: last.content + text };
            }
            return next;
          });
        },
        onError: (err) => {
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && last.role === 'assistant') {
              next[next.length - 1] = {
                ...last,
                content: `(Có lỗi xảy ra: ${err.message}. Vui lòng thử lại.)`,
              };
            }
            return next;
          });
        },
      });
    } finally {
      setStreaming(false);
    }
  };

  return (
    <>
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1, type: 'spring', stiffness: 200 }}
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full gradient-brand text-white shadow-2xl shadow-brand/40 transition-transform hover:scale-110"
        aria-label="Mở trợ lý AI"
      >
        {open ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 z-50 flex h-[560px] w-[400px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
          >
            <div className="flex items-center gap-2 border-b border-border/50 bg-gradient-to-r from-brand/10 to-purple-500/10 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-full gradient-brand text-white">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <div className="font-display text-sm font-bold">CineNova Assistant</div>
                <div className="text-xs text-muted-foreground">Hỏi về phim, lịch chiếu, gợi ý</div>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Chào bạn! Mình có thể giúp bạn tìm phim, kiểm tra suất chiếu, gợi ý theo sở
                    thích. Thử một trong các câu hỏi dưới đây:
                  </p>
                  <div className="grid gap-2">
                    {STARTERS.map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="rounded-lg border border-border/50 bg-background/50 px-3 py-2 text-left text-xs transition-colors hover:border-brand/50 hover:bg-brand/5"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m, i) => <Bubble key={i} message={m} />)
              )}
              {streaming && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Đang trả lời...
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-center gap-2 border-t border-border/50 p-3"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Bạn muốn hỏi gì về phim?"
                disabled={streaming}
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
              <Button type="submit" size="icon" className="bg-brand hover:bg-brand-600" disabled={streaming || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Bubble({ message }: { message: Message }) {
  return (
    <div className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm',
          message.role === 'user'
            ? 'bg-brand text-white'
            : 'bg-muted text-foreground',
        )}
      >
        {message.content || <span className="opacity-50">…</span>}
      </div>
    </div>
  );
}
