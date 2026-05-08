import { Footer } from '@/components/layout/footer';
import { AdminGuard } from '@/components/admin/admin-guard';
import { AdminSidebar } from '@/components/admin/admin-sidebar';

export const metadata = { title: 'Admin Dashboard' };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <div className="flex min-h-screen flex-col">
        <div className="flex flex-1">
          <AdminSidebar />
          <main className="flex-1 bg-muted/20 p-8">{children}</main>
        </div>
        <Footer />
      </div>
    </AdminGuard>
  );
}
