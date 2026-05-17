import { FastifyInstance } from 'fastify';

// Integration status route — public endpoint for monitoring
// Reports whether each external integration is configured (real) or falling back to mock

type IntegrationStatus = {
  active: boolean;
  mode: 'real' | 'mock';
};

type IntegrationsStatusResponse = {
  duffel: IntegrationStatus;
  aviasales: IntegrationStatus;
  yookassa: IntegrationStatus;
  anthropic: IntegrationStatus;
  sentry: IntegrationStatus;
};

function isActive(...keys: string[]): boolean {
  return keys.every((key) => Boolean(process.env[key]));
}

function integrationStatus(...keys: string[]): IntegrationStatus {
  const active = isActive(...keys);
  return { active, mode: active ? 'real' : 'mock' };
}

export async function integrationsRoutes(fastify: FastifyInstance) {
  // GET /api/integrations/status — returns active/mock state of each integration
  fastify.get('/status', async (_request, reply) => {
    const body: IntegrationsStatusResponse = {
      duffel: integrationStatus('DUFFEL_API_KEY'),
      aviasales: integrationStatus('AVIASALES_TOKEN'),
      yookassa: integrationStatus('YOOKASSA_SHOP_ID', 'YOOKASSA_SECRET_KEY'),
      anthropic: integrationStatus('ANTHROPIC_API_KEY'),
      // Sentry is not yet integrated — always mock
      sentry: { active: false, mode: 'mock' },
    };

    return reply.send(body);
  });
}
