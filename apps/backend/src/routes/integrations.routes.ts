import { FastifyInstance } from 'fastify';

// Integration status route — public endpoint for monitoring
// Reports whether each external integration is configured (real) or falling back to mock

type AmadeusStatus = {
  configured: boolean;
  mode: 'sandbox' | 'production' | 'mock';
  base_url?: string;
};

type IntegrationStatus = {
  configured: boolean;
  mode: 'real' | 'mock';
};

type IntegrationsStatusResponse = {
  amadeus: AmadeusStatus;
  duffel: IntegrationStatus & { note?: string };
  aviasales: IntegrationStatus;
  yookassa: IntegrationStatus;
  duffelLive: { note: string };
};

function isConfigured(...keys: string[]): boolean {
  return keys.every((key) => Boolean(process.env[key]));
}

function integrationStatus(...keys: string[]): IntegrationStatus {
  const configured = isConfigured(...keys);
  return { configured, mode: configured ? 'real' : 'mock' };
}

function amadeusStatus(): AmadeusStatus {
  const clientId = process.env.AMADEUS_CLIENT_ID;
  const configured = Boolean(clientId);

  if (!configured) {
    return { configured: false, mode: 'mock' };
  }

  const baseUrl =
    process.env.AMADEUS_BASE_URL ?? 'https://test.api.amadeus.com';
  const isProduction = !baseUrl.includes('test.');
  const mode: AmadeusStatus['mode'] = isProduction ? 'production' : 'sandbox';

  return { configured: true, mode, base_url: baseUrl };
}

export async function integrationsRoutes(fastify: FastifyInstance) {
  // GET /api/integrations/status — returns configured/mock state of each integration
  fastify.get('/status', async (_request, reply) => {
    const body: IntegrationsStatusResponse = {
      amadeus: amadeusStatus(),
      duffel: integrationStatus('DUFFEL_API_KEY'),
      aviasales: integrationStatus('AVIASALES_TOKEN'),
      yookassa: integrationStatus('YOOKASSA_SHOP_ID', 'YOOKASSA_SECRET_KEY'),
      duffelLive: {
        note: 'Requires account verification at duffel.com',
      },
    };

    return reply.send(body);
  });
}
