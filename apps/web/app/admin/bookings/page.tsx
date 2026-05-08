'use client';

export default function AdminBookingsPage() {
  return (
    <div>
      <h1 className="font-display text-3xl font-bold tracking-tight">Đặt vé</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Truy vấn các giao dịch đặt vé qua <code>GET /admin/bookings</code> (sẽ thêm UI ở M10).
      </p>
    </div>
  );
}
