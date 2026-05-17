import { FastifyInstance } from 'fastify';

// Default popular hotel cities fallback (shown when SearchHistory has no hotel data)
const FALLBACK_POPULAR_HOTELS = [
  { city: 'Дубай', country: 'ОАЭ', code: 'DXB', count: 890 },
  { city: 'Бали', country: 'Индонезия', code: 'DPS', count: 760 },
  { city: 'Анталья', country: 'Турция', code: 'AYT', count: 640 },
  { city: 'Бангкок', country: 'Таиланд', code: 'BKK', count: 530 },
];

// Hotels routes
export async function hotelsRoutes(fastify: FastifyInstance) {
  // GET /api/hotels/popular — top-10 hotel cities from search history (public, no auth required)
  fastify.get('/popular', {
    handler: async (_request, reply) => {
      try {
        const { prisma } = await import('../lib/prisma');

        // Aggregate hotel search history by city/destination code
        const rows = await prisma.searchHistory.findMany({
          where: { type: 'hotel' },
          select: { query: true },
          take: 1000,
          orderBy: { createdAt: 'desc' },
        });

        if (rows.length === 0) {
          return reply.send(FALLBACK_POPULAR_HOTELS);
        }

        // Parse queries and count city codes
        const counts = new Map<string, { city: string; country: string; code: string; count: number }>();
        for (const row of rows) {
          try {
            const q = JSON.parse(row.query) as {
              city?: string;
              country?: string;
              code?: string;
              destination?: string;
            };

            const code = (q.code ?? q.destination ?? '').toUpperCase();
            if (!code) continue;

            const existing = counts.get(code);
            if (existing) {
              existing.count += 1;
            } else {
              counts.set(code, {
                city: q.city ?? code,
                country: q.country ?? '',
                code,
                count: 1,
              });
            }
          } catch {
            // Skip unparseable queries
          }
        }

        if (counts.size === 0) {
          return reply.send(FALLBACK_POPULAR_HOTELS);
        }

        const sorted = [...counts.values()]
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        return reply.send(sorted);
      } catch {
        // On DB error — return hardcoded fallback so public endpoint never fails
        return reply.send(FALLBACK_POPULAR_HOTELS);
      }
    },
  });
}
