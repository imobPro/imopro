/**
 * Teste de carga — webhook da Z-API.
 *
 * Instalação (k6 não é npm):
 *   brew install k6           # macOS
 *   sudo apt install k6       # Linux, ver docs para o repositório
 *   choco install k6          # Windows
 *
 * Uso:
 *   BASE_URL=http://localhost:3000 WEBHOOK_TOKEN=xxx k6 run src/tests/load/webhook-zapi.js
 *
 * Alternativa rápida sem instalar nada, pra um número grosso em 30 segundos:
 *   npx autocannon -c 50 -d 30 -m POST \
 *     -H "X-Webhook-Token: xxx" \
 *     -b '{"phone":"5521999999999","text":{"message":"oi"}}' \
 *     http://localhost:3000/webhook/whatsapp
 *
 * ─── LEIA ANTES DE RODAR ──────────────────────────────────────────────────
 *
 * MOCKE A CLAUDE API E A Z-API. Sem mock, este teste mede a latência da
 * Anthropic e do Supabase free tier, não a qualidade do seu código — e ainda
 * queima token de verdade. Rode com NODE_ENV=test e os adaptadores externos
 * substituídos por stubs.
 *
 * O QUE ESTE TESTE REALMENTE DESCOBRE:
 *
 * Não é "quantas req/s eu aguento". É uma pergunta de arquitetura:
 * o webhook responde rápido e enfileira, ou fica esperando a IA responder?
 *
 * Se o p95 abaixo passar de ~1 segundo, seu webhook provavelmente está
 * processando de forma síncrona. Isso quebra em produção de um jeito específico
 * e feio: a Z-API dá timeout, reenvia a mesma mensagem, e o lead recebe a
 * resposta duplicada. Ou pior — dois processamentos concorrentes da mesma
 * conversa, com o histórico ficando inconsistente.
 *
 * O webhook deve fazer três coisas e devolver 200: validar o token, gravar a
 * mensagem, jogar na fila do BullMQ. Todo o resto acontece depois.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const falhas = new Rate('falhas_webhook');
const tempoAceite = new Trend('tempo_ate_aceitar');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const WEBHOOK_TOKEN = __ENV.WEBHOOK_TOKEN || 'token-de-teste';

export const options = {
  scenarios: {
    // Cenário realista: uma imobiliária com movimento normal,
    // e uma rajada simulando campanha de marketing ou anúncio no ar.
    normal: {
      executor: 'constant-arrival-rate',
      rate: 5,
      timeUnit: '1s',
      duration: '30s',
      preAllocatedVUs: 10,
      maxVUs: 30,
      tags: { cenario: 'normal' },
    },
    rajada: {
      executor: 'ramping-arrival-rate',
      startTime: '35s',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 20,
      maxVUs: 100,
      stages: [
        { target: 50, duration: '20s' },
        { target: 50, duration: '30s' },
        { target: 0, duration: '10s' },
      ],
      tags: { cenario: 'rajada' },
    },
  },

  thresholds: {
    // O webhook aceita e enfileira. Isso é trabalho de milissegundos.
    'http_req_duration{cenario:normal}': ['p(95)<300'],
    'http_req_duration{cenario:rajada}': ['p(95)<1000'],
    falhas_webhook: ['rate<0.01'],
    http_req_failed: ['rate<0.01'],
  },
};

function mensagemDeLead() {
  const exemplos = [
    'Oi, vi o anúncio do apartamento em Icaraí, ainda está disponível?',
    'Bom dia! Procuro apartamento de 2 quartos pra alugar em Niterói',
    'Quanto custa o de 3 quartos no Ingá?',
    'Tenho um imóvel e queria que vocês administrassem o aluguel',
    'Quero agendar uma visita, pode ser sábado?',
  ];
  const telefone = `5521${Math.floor(900000000 + Math.random() * 99999999)}`;

  return JSON.stringify({
    phone: telefone,
    messageId: `LOAD-${__VU}-${__ITER}-${Date.now()}`,
    text: { message: exemplos[Math.floor(Math.random() * exemplos.length)] },
    momment: Date.now(),
    fromMe: false,
  });
}

export default function () {
  const inicio = Date.now();

  const res = http.post(`${BASE_URL}/webhook/whatsapp`, mensagemDeLead(), {
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Token': WEBHOOK_TOKEN,
    },
    timeout: '10s',
  });

  tempoAceite.add(Date.now() - inicio);

  const ok = check(res, {
    'aceitou (2xx)': (r) => r.status >= 200 && r.status < 300,
    'respondeu rápido — enfileirou, não processou': (r) => r.timings.duration < 1000,
    'não vazou stack trace no erro': (r) =>
      !r.body || (!r.body.includes('at Object.') && !r.body.includes('node_modules')),
  });

  falhas.add(!ok);
  sleep(0.1);
}

/**
 * ─── SEGUNDO TESTE, MAIS IMPORTANTE QUE O RPS ─────────────────────────────
 *
 * Rode isto separado, com um único número de telefone e 20 requisições
 * simultâneas simulando a Z-API reenviando por timeout:
 *
 *   - A mesma mensagem (mesmo messageId) foi processada uma vez só?
 *   - O lead recebeu uma resposta ou vinte?
 *
 * Idempotência é o que separa um webhook que funciona no seu computador de um
 * que funciona no mundo real. Provedor de mensagem SEMPRE reenvia — a garantia
 * deles é "pelo menos uma vez", nunca "exatamente uma vez". O deduplicador é
 * responsabilidade sua.
 *
 * Se não houver constraint UNIQUE em messageId no banco, este teste vai falhar
 * e é bom que falhe agora.
 */
