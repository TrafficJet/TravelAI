import { FastifyInstance } from 'fastify';

// Integration status route — public endpoint for monitoring.
// Reports whether each external integration is configured (real) or falling back to mock.

type TravelpayoutsStatus = {
  configured:    boolean;
  mode:          'real' | 'mock';
  flights_api?:  string;
  hotels_api?:   string;
};

type IntegrationStatus = {
  configured: boolean;
  mode:       'real' | 'mock';
};

type IntegrationsStatusResponse = {
  travelpayouts: TravelpayoutsStatus;
  duffel:        IntegrationStatus & { note?: string };
  aviasales:     IntegrationStatus;
  yookassa:      IntegrationStatus;
  duffelLive:    { note: string };
};

function isConfigured(...keys: string[]): boolean {
  return keys.every((key) => Boolean(process.env[key]));
}

function integrationStatus(...keys: string[]): IntegrationStatus {
  const configured = isConfigured(...keys);
  return { configured, mode: configured ? 'real' : 'mock' };
}

function travelpayoutsStatus(): TravelpayoutsStatus {
  const configured = Boolean(process.env.TRAVELPAYOUTS_API_KEY);

  if (!configured) {
    return { configured: false, mode: 'mock' };
  }

  return {
    configured: true,
    mode:       'real',
    flights_api: 'https://api.travelpayouts.com/aviasales/v3/prices_for_dates',
    hotels_api:  'https://engine.hotellook.com/api/v2/cache.json',
  };
}

export async function integrationsRoutes(fastify: FastifyInstance) {
  // GET /api/integrations/status — returns configured/mock state of each integration
  fastify.get('/status', async (_request, reply) => {
    const body: IntegrationsStatusResponse = {
      travelpayouts: travelpayoutsStatus(),
      duffel:        integrationStatus('DUFFEL_API_KEY'),
      aviasales:     integrationStatus('TRAVELPAYOUTS_API_KEY'),
      yookassa:      integrationStatus('YOOKASSA_SHOP_ID', 'YOOKASSA_SECRET_KEY'),
      duffelLive: {
        note: 'Requires account verification at duffel.com',
      },
    };

    return reply.send(body);
  });
}
