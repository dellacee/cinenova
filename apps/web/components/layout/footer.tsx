import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-muted/20">
      <div className="container grid gap-8 py-12 md:grid-cols-4">
        <div>
          <h3 className="font-display text-lg font-bold">CineNova</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Where every seat tells a story.
          </p>
        </div>
        <FooterCol
          title="Khám phá"
          items={[
            { href: '/movies?status=NOW_SHOWING', label: 'Đang chiếu' },
            { href: '/movies?status=COMING_SOON', label: 'Sắp chiếu' },
            { href: '/theaters', label: 'Hệ thống rạp' },
            { href: '/promotions', label: 'Ưu đãi' },
          ]}
        />
        <FooterCol
          title="Hỗ trợ"
          items={[
            { href: '/help', label: 'Trung tâm trợ giúp' },
            { href: '/terms', label: 'Điều khoản' },
            { href: '/privacy', label: 'Chính sách bảo mật' },
          ]}
        />
        <FooterCol
          title="Mã nguồn"
          items={[
            { href: 'https://github.com/dellacee/cinenova', label: 'GitHub' },
            { href: '/docs', label: 'Tài liệu kỹ thuật' },
          ]}
        />
      </div>
      <div className="border-t border-border/30 py-6">
        <p className="container text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} CineNova · Built with Next.js, NestJS, FastAPI · Movie data © TMDb
        </p>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  items,
}: {
  title: string;
  items: Array<{ href: string; label: string }>;
}) {
  return (
    <div>
      <h4 className="text-sm font-semibold">{title}</h4>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="text-sm text-muted-foreground hover:text-foreground">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
