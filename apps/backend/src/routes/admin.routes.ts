import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import { adminAuth } from '../middleware/admin.middleware';

// HTML layout helper — Bootstrap 5 with sidebar navigation
// adminSecret is embedded in a meta tag so JS can read it without window.prompt()
function adminLayout(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>${title} — Travel AI Admin</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3/dist/css/bootstrap.min.css">
  <style>
    body { background: #f8f9fa; }
    .sidebar { background: #1e40af; min-height: 100vh; padding: 20px; }
    .sidebar a { color: #bfdbfe; display: block; padding: 8px 0; text-decoration: none; }
    .sidebar a:hover { color: white; }
    .stat-card { border-radius: 12px; }
  </style>
</head>
<body>
<div class="d-flex">
  <div class="sidebar col-2">
    <h5 class="text-white mb-4">&#9992;&#65039; Travel AI</h5>
    <a href="/admin/dashboard">&#128202; Дашборд</a>
    <a href="/admin/users">&#128101; Пользователи</a>
    <a href="/admin/bookings">&#127915; Брони</a>
  </div>
  <div class="col-10 p-4">${content}</div>
</div>
</body>
</html>`;
}

// Escape HTML special chars to prevent XSS in server-rendered tables
function esc(val: unknown): string {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function adminRoutes(fastify: FastifyInstance) {
  // All admin routes require x-admin-secret header
  fastify.addHook('preHandler', adminAuth);

  // GET /admin/dashboard — HTML dashboard with overall statistics
  fastify.get('/dashboard', async (_req, reply) => {
    const [
      totalUsers,
      totalBookings,
      bookingsByStatus,
      completedRevenue,
      activeSubscriptions,
      topSpenders,
      walletStats,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.booking.count(),
      prisma.booking.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.booking.aggregate({
        where: { status: 'CONFIRMED' },
        _sum: { totalPrice: true },
      }),
      prisma.subscription.count({
        where: { plan: 'PREMIUM', status: 'ACTIVE' },
      }),
      prisma.booking.groupBy({
        by: ['userId'],
        where: { status: 'CONFIRMED' },
        _sum: { totalPrice: true },
        orderBy: { _sum: { totalPrice: 'desc' } },
        take: 5,
      }),
      prisma.walletTransaction.aggregate({
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    // Compute per-status counts map
    const statusMap: Record<string, number> = {};
    for (const row of bookingsByStatus) {
      statusMap[row.status] = row._count.id;
    }

    // Resolve user details for top spenders
    const topSpenderIds = topSpenders.map((s) => s.userId);
    const topSpenderUsers = await prisma.user.findMany({
      where: { id: { in: topSpenderIds } },
      select: { id: true, email: true, name: true },
    });
    const spenders = topSpenders.map((s) => {
      const user = topSpenderUsers.find((u) => u.id === s.userId);
      return {
        email: user?.email ?? 'unknown',
        name: user?.name ?? '',
        total: Number(s._sum.totalPrice ?? 0),
      };
    });

    const revenue = Number(completedRevenue._sum.totalPrice ?? 0).toFixed(2);

    const statusRows = ['PENDING', 'CONFIRMED', 'CANCELLED', 'FAILED']
      .map(
        (s) => `<tr><td>${esc(s)}</td><td>${esc(statusMap[s] ?? 0)}</td></tr>`,
      )
      .join('');

    const spenderRows = spenders
      .map(
        (s) =>
          `<tr>
            <td>${esc(s.email)}</td>
            <td>${esc(s.name)}</td>
            <td><strong>${esc(s.total.toFixed(2))} ₽</strong></td>
          </tr>`,
      )
      .join('');

    const content = `
      <h2 class="mb-4">Дашборд</h2>
      <div class="row g-3 mb-4">
        <div class="col-md-3">
          <div class="card stat-card text-bg-primary p-3">
            <div class="fs-1 fw-bold">${totalUsers}</div>
            <div>Пользователей</div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card stat-card text-bg-success p-3">
            <div class="fs-1 fw-bold">${totalBookings}</div>
            <div>Броней всего</div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card stat-card text-bg-warning p-3">
            <div class="fs-1 fw-bold">${revenue} ₽</div>
            <div>Оборот (confirmed)</div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card stat-card text-bg-info p-3">
            <div class="fs-1 fw-bold">${activeSubscriptions}</div>
            <div>Подписок PREMIUM</div>
          </div>
        </div>
      </div>

      <div class="row g-3 mb-4">
        <div class="col-md-6">
          <div class="card p-3">
            <h5>Брони по статусам</h5>
            <table class="table table-sm mb-0">
              <thead><tr><th>Статус</th><th>Количество</th></tr></thead>
              <tbody>${statusRows}</tbody>
            </table>
          </div>
        </div>
        <div class="col-md-6">
          <div class="card p-3">
            <h5>Кошельки</h5>
            <p class="mb-1">Всего транзакций: <strong>${walletStats._count.id}</strong></p>
            <p class="mb-0">Суммарный объём: <strong>${Number(walletStats._sum.amount ?? 0).toFixed(2)} ₽</strong></p>
          </div>
        </div>
      </div>

      <div class="card p-3">
        <h5>Топ-5 пользователей по тратам</h5>
        <table class="table table-hover mb-0">
          <thead><tr><th>Email</th><th>Имя</th><th>Сумма</th></tr></thead>
          <tbody>${spenderRows || '<tr><td colspan="3" class="text-muted">Нет данных</td></tr>'}</tbody>
        </table>
      </div>`;

    reply.header('Content-Type', 'text/html; charset=utf-8');
    return reply.send(adminLayout('Дашборд', content));
  });

  // GET /admin/users — HTML table of all users
  fastify.get('/users', async (_req, reply) => {
    const users = await prisma.user.findMany({
      take: 500,
      orderBy: { createdAt: 'desc' },
      include: {
        wallet: { select: { balance: true } },
        subscription: { select: { plan: true, status: true } },
        _count: { select: { bookings: true } },
      },
    });

    const rows = users
      .map(
        (u) => `<tr>
          <td><small class="text-muted">${esc(u.id)}</small></td>
          <td>${esc(u.email)}</td>
          <td>${esc(u.name)}</td>
          <td><span class="badge bg-secondary">${esc(u.subscription?.plan ?? '—')}</span></td>
          <td>${esc(new Date(u.createdAt).toLocaleDateString('ru-RU'))}</td>
          <td>${esc(Number(u.wallet?.balance ?? 0).toFixed(2))} ₽</td>
          <td>${esc(u._count.bookings)}</td>
          <td>
            <button class="btn btn-sm btn-danger"
              onclick="banUser('${esc(u.id)}')"
              title="Заблокировать">Бан</button>
          </td>
        </tr>`,
      )
      .join('');

    const content = `
      <h2 class="mb-4">Пользователи <span class="badge bg-secondary">${users.length}</span></h2>
      <div class="card p-0 overflow-hidden">
        <table class="table table-hover mb-0">
          <thead class="table-dark">
            <tr>
              <th>ID</th><th>Email</th><th>Имя</th><th>Тариф</th>
              <th>Создан</th><th>Баланс</th><th>Броней</th><th>Действия</th>
            </tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="8" class="text-center text-muted p-3">Нет пользователей</td></tr>'}</tbody>
        </table>
      </div>
      <script>
        async function banUser(id) {
          if (!confirm('Заблокировать пользователя?')) return;
          const secret = sessionStorage.getItem('adminSecret') ?? '';
          const res = await fetch('/admin/users/' + id + '/ban', {
            method: 'POST',
            headers: { 'x-admin-secret': secret }
          });
          const data = await res.json();
          alert(data.message ?? JSON.stringify(data));
          location.reload();
        }
      </script>`;

    reply.header('Content-Type', 'text/html; charset=utf-8');
    return reply.send(adminLayout('Пользователи', content));
  });

  // GET /admin/bookings — HTML table of all bookings
  fastify.get('/bookings', async (_req, reply) => {
    const bookings = await prisma.booking.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        user: { select: { email: true } },
      },
    });

    const rows = bookings
      .map((b) => {
        const details = b.details as Record<string, unknown>;
        let detailsSummary = '';
        if (b.type === 'FLIGHT') {
          detailsSummary = `${esc(details['origin'] ?? '?')} → ${esc(details['destination'] ?? '?')}`;
        } else {
          detailsSummary = esc(details['hotelName'] ?? details['name'] ?? JSON.stringify(details).slice(0, 60));
        }
        const statusColors: Record<string, string> = {
          PENDING: 'warning',
          CONFIRMED: 'success',
          CANCELLED: 'secondary',
          FAILED: 'danger',
        };
        const badgeColor = statusColors[b.status] ?? 'secondary';
        return `<tr>
          <td><small class="text-muted">${esc(b.id)}</small></td>
          <td>${esc(b.user.email)}</td>
          <td><span class="badge bg-primary">${esc(b.type)}</span></td>
          <td><span class="badge bg-${badgeColor}">${esc(b.status)}</span></td>
          <td>${esc(Number(b.totalPrice).toFixed(2))} ${esc(b.currency)}</td>
          <td>${esc(new Date(b.createdAt).toLocaleDateString('ru-RU'))}</td>
          <td><small>${detailsSummary}</small></td>
        </tr>`;
      })
      .join('');

    const content = `
      <h2 class="mb-4">Брони <span class="badge bg-secondary">${bookings.length}</span></h2>
      <div class="card p-0 overflow-hidden">
        <table class="table table-hover mb-0">
          <thead class="table-dark">
            <tr>
              <th>ID</th><th>Пользователь</th><th>Тип</th><th>Статус</th>
              <th>Цена</th><th>Создана</th><th>Детали</th>
            </tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="7" class="text-center text-muted p-3">Нет броней</td></tr>'}</tbody>
        </table>
      </div>`;

    reply.header('Content-Type', 'text/html; charset=utf-8');
    return reply.send(adminLayout('Брони', content));
  });

  // GET /admin/stats/json — JSON API with admin statistics
  fastify.get('/stats/json', async (_req, reply) => {
    const [
      totalUsers,
      usersByPlan,
      totalBookings,
      bookingsByStatus,
      confirmedRevenue,
      totalWalletBalance,
      totalTransactions,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.subscription.groupBy({ by: ['plan'], _count: { id: true } }),
      prisma.booking.count(),
      prisma.booking.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.booking.aggregate({
        where: { status: 'CONFIRMED' },
        _sum: { totalPrice: true },
      }),
      prisma.wallet.aggregate({ _sum: { balance: true } }),
      prisma.walletTransaction.count(),
    ]);

    const byPlan: Record<string, number> = {};
    for (const row of usersByPlan) {
      byPlan[row.plan] = row._count.id;
    }

    const byStatus: Record<string, number> = {};
    for (const row of bookingsByStatus) {
      byStatus[row.status] = row._count.id;
    }

    const stats = {
      users: {
        total: totalUsers,
        byPlan,
      },
      bookings: {
        total: totalBookings,
        byStatus,
        revenue: Number(confirmedRevenue._sum.totalPrice ?? 0),
      },
      wallet: {
        totalBalance: Number(totalWalletBalance._sum.balance ?? 0),
        totalTransactions,
      },
    };

    return reply.send(stats);
  });

  // POST /admin/users/:id/ban — disable a user account
  fastify.post('/users/:id/ban', async (request, reply) => {
    const { id } = request.params as { id: string };

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }

    // The current schema has no isActive field; we revoke all refresh tokens
    // as a ban mechanism (user cannot get new access tokens)
    await prisma.refreshToken.updateMany({
      where: { userId: id, revoked: false },
      data: { revoked: true },
    });

    return reply.send({
      ok: true,
      message: `User ${user.email} banned — all sessions revoked`,
      userId: id,
    });
  });
}
