import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import Anthropic from '@anthropic-ai/sdk';
import { authenticate } from '../middleware/auth.middleware';

// Anthropic client for document scanning (Vision API)
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const MODEL = 'claude-opus-4-5';

// Maximum allowed image size: 5 MB (base64 length * 0.75 gives raw bytes)
const MAX_IMAGE_BYTES = 5_000_000;

// In-memory per-user rate limiter: 10 requests per hour
const SCAN_RATE_LIMIT = 10;
const SCAN_RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

interface ScanRateBucket {
  count: number;
  resetAt: number;
}

const scanRateBuckets = new Map<string, ScanRateBucket>();

type DocumentType = 'passport' | 'international_passport' | 'drivers_license';
type MimeType = 'image/jpeg' | 'image/png' | 'image/webp';

interface ScanBody {
  image: string;
  mimeType: MimeType;
  documentType: DocumentType;
}

interface DocumentData {
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  nationality: string | null;
  documentNumber: string | null;
  expiryDate: string | null;
  gender: 'M' | 'F' | null;
  issuingCountry: string | null;
}

/**
 * Build the extraction prompt for Claude Vision based on document type.
 */
function buildPrompt(documentType: DocumentType): string {
  return `You are a document scanner. Extract data from this ${documentType} image.
Return ONLY valid JSON with these fields:
{
  "firstName": "string or null",
  "lastName": "string or null",
  "dateOfBirth": "YYYY-MM-DD or null",
  "nationality": "string (country name in Russian) or null",
  "documentNumber": "string or null",
  "expiryDate": "YYYY-MM-DD or null",
  "gender": "M or F or null",
  "issuingCountry": "string or null"
}
If you cannot read the document clearly, return {"error": "CANNOT_READ"}.
Do not include any explanation, only JSON.`;
}

/**
 * Check whether the user has exceeded 10 scan requests per hour.
 * Returns true if the request is allowed, false if rate limited.
 */
function checkScanRateLimit(userId: string): boolean {
  const now = Date.now();
  let bucket = scanRateBuckets.get(userId);

  if (!bucket || now >= bucket.resetAt) {
    scanRateBuckets.set(userId, { count: 1, resetAt: now + SCAN_RATE_WINDOW_MS });
    return true;
  }

  bucket.count += 1;
  return bucket.count <= SCAN_RATE_LIMIT;
}

// POST /api/documents/scan handler
async function scanDocument(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { image, mimeType, documentType } = request.body as ScanBody;
  const userId = request.userId;

  // Rate limit: 10 requests per hour per user
  if (!checkScanRateLimit(userId)) {
    reply.status(429).send({
      success: false,
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Превышен лимит сканирований: 10 запросов в час.',
    });
    return;
  }

  // Validate image size (base64 → raw bytes approximation)
  if (image.length * 0.75 >= MAX_IMAGE_BYTES) {
    reply.status(400).send({
      success: false,
      error: 'IMAGE_TOO_LARGE',
      message: 'Изображение превышает допустимый размер 5 МБ.',
    });
    return;
  }

  fastify.log.info(
    { userId, documentType, imageSizeApprox: Math.round(image.length * 0.75) },
    'Document scan started',
  );

  let rawJson: string;

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data: image,
              },
            },
            {
              type: 'text',
              text: buildPrompt(documentType),
            },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    rawJson = textBlock && textBlock.type === 'text' ? textBlock.text.trim() : '';
  } catch (err) {
    request.log.error({ err, userId, documentType }, 'Claude Vision API call failed');
    reply.status(502).send({
      success: false,
      error: 'EXTRACTION_FAILED',
      message: 'Не удалось распознать документ',
    });
    return;
  }

  // Parse JSON returned by Claude
  let parsed: DocumentData & { error?: string };
  try {
    parsed = JSON.parse(rawJson) as DocumentData & { error?: string };
  } catch {
    request.log.warn({ userId, documentType, rawJson }, 'Claude returned non-JSON response');
    reply.status(422).send({
      success: false,
      error: 'EXTRACTION_FAILED',
      message: 'Не удалось распознать документ',
    });
    return;
  }

  // Claude explicitly signaled it cannot read the document
  if (parsed.error === 'CANNOT_READ') {
    request.log.info({ userId, documentType }, 'Document scan: CANNOT_READ');
    reply.status(422).send({
      success: false,
      error: 'EXTRACTION_FAILED',
      message: 'Не удалось распознать документ',
    });
    return;
  }

  const data: DocumentData = {
    firstName: parsed.firstName ?? null,
    lastName: parsed.lastName ?? null,
    dateOfBirth: parsed.dateOfBirth ?? null,
    nationality: parsed.nationality ?? null,
    documentNumber: parsed.documentNumber ?? null,
    expiryDate: parsed.expiryDate ?? null,
    gender: parsed.gender ?? null,
    issuingCountry: parsed.issuingCountry ?? null,
  };

  request.log.info(
    { userId, documentType, documentNumber: data.documentNumber },
    'Document scan completed successfully',
  );

  reply.send({ success: true, data });
}

// Workaround: capture fastify instance for log access inside the handler
let fastify: FastifyInstance;

// POST /api/documents/scan — scan a document image via Claude Vision API
export async function documentsRoutes(instance: FastifyInstance): Promise<void> {
  fastify = instance;

  // All document routes require authentication
  instance.addHook('preHandler', authenticate);

  /**
   * POST /api/documents/scan
   * Accepts a base64-encoded document image and returns extracted fields.
   * Rate limit: 10 requests/hour per authenticated user.
   */
  instance.post('/scan', {
    schema: {
      body: {
        type: 'object',
        required: ['image', 'mimeType', 'documentType'],
        properties: {
          image: { type: 'string', minLength: 1 },
          mimeType: {
            type: 'string',
            enum: ['image/jpeg', 'image/png', 'image/webp'],
          },
          documentType: {
            type: 'string',
            enum: ['passport', 'international_passport', 'drivers_license'],
          },
        },
      },
    },
    handler: scanDocument,
  });
}
