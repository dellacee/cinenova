import type { PrismaClient } from '../src/index.js';

interface RoomSpec {
  name: string;
  rows: string[];
  cols: number;
  vipRows?: string[];
  coupleRows?: string[];
}

interface TheaterSpec {
  slug: string;
  name: string;
  city: string;
  district: string;
  addressLine: string;
  rooms: RoomSpec[];
}

const THEATERS: TheaterSpec[] = [
  {
    slug: 'cinenova-quan-1',
    name: 'CineNova Saigon Centre',
    city: 'Hồ Chí Minh',
    district: 'Quận 1',
    addressLine: '123 Lê Lợi, Bến Thành, Quận 1, TP.HCM',
    rooms: [
      { name: 'Phòng 1', rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], cols: 12, vipRows: ['E', 'F'] },
      { name: 'Phòng 2', rows: ['A', 'B', 'C', 'D', 'E', 'F'], cols: 10, coupleRows: ['F'] },
      { name: 'Phòng IMAX', rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'], cols: 14, vipRows: ['F', 'G', 'H'] },
    ],
  },
  {
    slug: 'cinenova-go-vap',
    name: 'CineNova Gò Vấp',
    city: 'Hồ Chí Minh',
    district: 'Gò Vấp',
    addressLine: '88 Quang Trung, P.10, Gò Vấp, TP.HCM',
    rooms: [
      { name: 'Phòng 1', rows: ['A', 'B', 'C', 'D', 'E', 'F'], cols: 10, vipRows: ['D', 'E'] },
      { name: 'Phòng 2', rows: ['A', 'B', 'C', 'D', 'E'], cols: 8 },
    ],
  },
  {
    slug: 'cinenova-hanoi-trang-tien',
    name: 'CineNova Tràng Tiền',
    city: 'Hà Nội',
    district: 'Hoàn Kiếm',
    addressLine: '24 Tràng Tiền, Hoàn Kiếm, Hà Nội',
    rooms: [
      { name: 'Phòng 1', rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G'], cols: 12, vipRows: ['E', 'F'], coupleRows: ['G'] },
      { name: 'Phòng 2', rows: ['A', 'B', 'C', 'D', 'E', 'F'], cols: 10 },
    ],
  },
  {
    slug: 'cinenova-da-nang',
    name: 'CineNova Đà Nẵng',
    city: 'Đà Nẵng',
    district: 'Hải Châu',
    addressLine: '255 Nguyễn Văn Linh, Hải Châu, Đà Nẵng',
    rooms: [
      { name: 'Phòng 1', rows: ['A', 'B', 'C', 'D', 'E', 'F'], cols: 10 },
      { name: 'Phòng IMAX', rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], cols: 12, vipRows: ['E', 'F', 'G'] },
    ],
  },
  {
    slug: 'cinenova-can-tho',
    name: 'CineNova Cần Thơ',
    city: 'Cần Thơ',
    district: 'Ninh Kiều',
    addressLine: '1 Đại lộ Hòa Bình, Ninh Kiều, Cần Thơ',
    rooms: [{ name: 'Phòng 1', rows: ['A', 'B', 'C', 'D', 'E', 'F'], cols: 10, vipRows: ['D', 'E'] }],
  },
];

export async function seedTheaters(prisma: PrismaClient) {
  let totalRooms = 0;
  let totalSeats = 0;

  for (const t of THEATERS) {
    const theater = await prisma.theater.upsert({
      where: { slug: t.slug },
      update: { name: t.name, city: t.city, district: t.district, addressLine: t.addressLine },
      create: {
        slug: t.slug,
        name: t.name,
        city: t.city,
        district: t.district,
        addressLine: t.addressLine,
      },
    });

    for (const r of t.rooms) {
      const layoutJson = {
        rows: r.rows,
        cols: r.cols,
        aisleCols: [Math.floor(r.cols / 2)],
        vipRows: r.vipRows ?? [],
        coupleRows: r.coupleRows ?? [],
      };

      const room = await prisma.screeningRoom.upsert({
        where: {
          // composite via theaterId + name not declared as @@unique to keep the schema minimal,
          // so we use findFirst + create flow instead
          id: `room-${theater.slug}-${r.name.replace(/\s+/g, '-')}`,
        },
        update: {},
        create: {
          id: `room-${theater.slug}-${r.name.replace(/\s+/g, '-')}`,
          theaterId: theater.id,
          name: r.name,
          rowsCount: r.rows.length,
          colsCount: r.cols,
          layoutJson,
        },
      });
      totalRooms++;

      const seatRows = r.coupleRows ?? [];
      const vipRows = r.vipRows ?? [];

      for (const row of r.rows) {
        const colsForRow = seatRows.includes(row) ? Math.floor(r.cols / 2) : r.cols;
        const type = seatRows.includes(row) ? 'COUPLE' : vipRows.includes(row) ? 'VIP' : 'STANDARD';

        for (let col = 1; col <= colsForRow; col++) {
          await prisma.seat.upsert({
            where: { roomId_row_col: { roomId: room.id, row, col } },
            update: {},
            create: { roomId: room.id, row, col, type },
          });
          totalSeats++;
        }
      }
    }
  }

  console.info(`  • theaters: ${THEATERS.length}, rooms: ${totalRooms}, seats: ${totalSeats}`);
}
