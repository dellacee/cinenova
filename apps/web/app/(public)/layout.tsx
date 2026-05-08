import { ChatWidget } from '@/components/ai/chat-widget';
import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <ChatWidget />
    </div>
  );
}
