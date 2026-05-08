'use client';

export default function AdminVouchersPage() {
  return (
    <div>
      <h1 className="font-display text-3xl font-bold tracking-tight">Voucher</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        CRUD voucher endpoint sẵn ở API (<code>POST /admin/vouchers</code>) — UI sẽ thêm sau khi seed
        thêm preset.
      </p>
    </div>
  );
}
