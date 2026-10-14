/**
 * 鍋ユ緶绉戞妧鏁版櫤鍖婚櫌鏅鸿兘浣?- BFF HTTP/WebSocket 鏈嶅姟鍣? *
 * 鍩轰簬 Bun 鍘熺敓杩愯鏃讹紝闆堕澶栦緷璧栵細
 *  - REST锛氱粺涓€ /api/v1 鍓嶇紑锛岃仛鍚堝悗绔湇鍔″苟閫傞厤鍓嶇
 *  - WS锛?ws/chat 瀵硅瘽娴佸紡涓庡憡璀︽帹閫侊紙闇€閴存潈锛? *  - 涓棿浠讹細璁よ瘉 / 闄愭祦 / CSRF / 瀹夊叏澶?/ 鏃ュ織 / 閿欒澶勭悊
 *
 * 鍚姩锛歜un run src/bff/server.ts
 *
 * Copyright (c) 2026 鏉窞鍋ユ緶绉戞妧鏈夐檺鍏徃
 */

import { attachUser, newCtx, requireAuth, verifyJwt } from './middleware/auth';
import { verifyCsrf } from './middleware/csrf';
import { withErrorHandler } from './middleware/error';
import { logRequest } from './middleware/log';
import { rateLimit } from './middleware/rateLimit';
import { withSecurityHeaders } from './middleware/securityHeaders';
import { tenantContextMiddleware } from './middleware/tenant';
import { withIdempotency } from './middleware/idempotency';
import { enforceSession } from './middleware/sessionGuard';
import { runChatTurn } from './aggregators/chatAggregator';
import { metrics, recordHttpRequest, renderMetrics } from './observability/metrics';
import { setCriticalAlertSink } from './alertBus';
import { OutboxRelay } from './outboxRelay';
import { autoMigrate, closeDb, verifyDbConnection } from '@/db';
import {
  createConversation,
  getConversationById,
} from '@/db/repositories/conversationRepo';
import { authRoutes } from './routes/auth';
import { mfaLoginRoutes } from './routes/mfa';
import { permissionAdminRoutes } from './routes/admin/permissions';
import { tenantAdminRoutes } from './routes/admin/tenants';
import { userAdminRoutes } from './routes/admin/users';
import { roleAdminRoutes } from './routes/admin/roles';
import { auditLogRoutes } from './routes/admin/auditLogs';
import { loginLogRoutes } from './routes/admin/loginLogs';
import { tenantService } from '@/tenant';
import { chatRoutes } from './routes/chat';
import { dashboardRoutes } from './routes/dashboard';
import { imagingRoutes } from './routes/imaging';
import { medicalRoutes } from './routes/medical';
import { operationRoutes } from './routes/operation';
import { outpatientRoutes } from './routes/outpatient';
import { inpatientRoutes } from './routes/inpatient';
import { inpatientCareRoutes } from './routes/inpatientCare';
import { emergencyRoutes } from './routes/emergency';
import { pharmacyRoutes } from './routes/pharmacy';
import { medicalQcRoutes } from './routes/medicalQc';
import { voiceMedicalRoutes } from './routes/voiceMedical';
import { frontPageRoutes } from './routes/frontPage';
import { researchRoutes } from './routes/research';
import { empiRoutes } from './routes/empi';
import { dataWarehouseRoutes } from './routes/dataWarehouse';
import { dataGovernanceRoutes } from './routes/dataGovernance';
import { outboxRoutes } from './routes/outbox';
import { sessionAdminRoutes } from './routes/sessions';
import { billingRoutes } from './routes/billing';
import { drgRoutes } from './routes/drg';
import { labInterpretRoutes } from './routes/labInterpret';
import { imagingInterpretRoutes } from './routes/imagingInterpret';
import { criticalRoutes } from './routes/critical';
import { reconRoutes } from './routes/recon';
import { surgeryRoutes } from './routes/surgery';
import { transfusionRoutes } from './routes/transfusion';
import { bloodQualityRoutes } from './routes/bloodQuality';
import { vteRoutes } from './routes/vte';
import { amsRoutes } from './routes/ams';
import { pathwayRoutes } from './routes/pathway';
import { mobileNursingRoutes } from './routes/mobileNursing';
import { nursingAdminRoutes } from './routes/nursingAdmin';
import { nursingRiskRoutes } from './routes/nursingRisk';
import { medAdminRoutes } from './routes/medAdmin';
import { tubeCareRoutes } from './routes/tubeCare';
import { nursingEventReviewRoutes } from './routes/nursingEventReview';
import { nursingIoRoutes } from './routes/nursingIo';
import { nutritionScreeningRoutes } from './routes/nutritionScreening';
import { painAssessmentRoutes } from './routes/painAssessment';
import { preopAssessmentRoutes } from './routes/preopAssessment';
import { pacuRecordRoutes } from './routes/pacuRecord';
import { postopFollowupRoutes } from './routes/postopFollowup';
import { icuSedationRoutes } from './routes/icuSedation';
import { postpartumRoutes } from './routes/postpartumVisit';
import { erTriageRoutes } from './routes/erTriage';
import { barthelRoutes } from './routes/barthel';
import { erGreenRoutes } from './routes/erGreen';
import { chronicRoutes } from './routes/chronicDisease';
import { patientChronicRoutes } from './routes/patientChronic';
import { healthCheckRoutes } from './routes/healthCheck';
import { healthCheckReferralRoutes } from './routes/healthCheckReferral';
import { oncologyRoutes } from './routes/oncology';
import { chemoReminderRoutes } from './routes/chemoReminder';
import { psychScreeningRoutes } from './routes/psychScreening';
import { nissRoutes } from './routes/nissReporting';
import { vteAnticoagRoutes } from './routes/vteAnticoag';
import { orderCdsRoutes } from './routes/orderCds';
import { nurseStationRoutes } from './routes/nurseStation';
import { scheduleSlotRoutes } from './routes/scheduleSlot';
import { reportPushRoutes } from './routes/reportPush';
import { patientNotificationRoutes } from './routes/patientNotification';
import { patientBillingRoutes } from './routes/patientBilling';
import { rehabTreatmentRoutes } from './routes/rehabTreatment';
import { painClinicRoutes } from './routes/painClinic';
import { cgaRoutes } from './routes/cga';
import { nutritionConsultRoutes } from './routes/nutritionConsult';
import { stopbangRoutes } from './routes/stopbang';
import { dischargePlanRoutes } from './routes/dischargePlan';
import { dischargeSummaryRoutes } from './routes/dischargeSummary';
import { vitalsTrendRoutes } from './routes/vitalsTrend';
import { medicalArchiveRoutes } from './routes/medicalArchive';
import { medicalCopyRoutes } from './routes/medicalCopy';
import { admissionNoteRoutes } from './routes/admissionNote';
import { progressNoteRoutes } from './routes/progressNote';
import { consultRequestRoutes } from './routes/consultRequest';
import { consentFormRoutes } from './routes/consentForm';
import { orderRoutes } from './routes/order';
import { nursingRecordRoutes } from './routes/nursingRecord';
import { surgeryRecordRoutes } from './routes/surgeryRecord';
import { medicalHeaderRoutes } from './routes/medicalHeader';
import { followupApptRoutes } from './routes/followupAppt';
import { satisfactionSurveyRoutes } from './routes/satisfactionSurvey';
import { satisfactionReminderRoutes } from './routes/satisfactionReminder';
import { mdtRoutes } from './routes/mdt';
import { mdtTreatmentPlanRoutes } from './routes/mdtTreatmentPlan';
import { piccRoutes } from './routes/picc';
import { cdiRoutes } from './routes/cdi';
import { transfusionReactionRoutes } from './routes/transfusionReaction';
import { sbarRoutes } from './routes/sbar';
import { edObservationRoutes } from './routes/edObservation';
import { infectionDashboardRoutes } from './routes/infectionDashboard';
import { amDashboardRoutes } from './routes/amDashboard';
import { doctorWorkbenchRoutes } from './routes/doctorWorkbench';
import { patientPortalRoutes } from './routes/patientPortal';
import { surgicalChecklistRoutes } from './routes/surgicalChecklist';
import { renewalRoutes } from './routes/renewalFlow';
import { drgBudgetRoutes } from './routes/drgBudget';
import { inpatientCostMonitorRoutes } from './routes/inpatientCostMonitor';
import { costAttributionRoutes } from './routes/costAttribution';
import { improvementTaskRoutes } from './routes/improvementTask';
import { improvementOutcomeRoutes } from './routes/improvementOutcome';
import { dipRoutes } from './routes/dip';
import { paymentSelectionRoutes } from './routes/paymentSelection';
import { settlementReportRoutes } from './routes/settlementReport';
import { settlementAnalyticsRoutes } from './routes/settlementAnalytics';
import { settlementDrilldownRoutes } from './routes/settlementDrilldown';
import { lisRoutes } from './routes/lis';
import { risRoutes } from './routes/ris';
import { apptRoutes } from './routes/appt';
import { internetHospitalRoutes } from './routes/internetHospital';
import { consultationRoutes } from './routes/consultation';
import { internetPrescriptionRoutes } from './routes/internetPrescription';
import { internetPaymentRoutes } from './routes/internetPayment';
import { internetDeliveryRoutes } from './routes/internetDelivery';
import { satisfactionRoutes } from './routes/satisfaction';
import { smartTriageRoutes } from './routes/smartTriage';
import { delegationRoutes } from './routes/delegation';
import { referralRoutes } from './routes/referral';
import { knowledgeBaseRoutes } from './routes/knowledgeBase';
import { agentBuilderRoutes } from './routes/agentBuilder';
import { agentRuntimeRoutes } from './routes/agentRuntime';
import { patientRoutes } from './routes/patient';
import { qualityRoutes } from './routes/quality';
import { rectificationRoutes } from './routes/rectification';
import { skillRoutes } from './routes/skills';
import { systemRoutes } from './routes/system';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from './types';

// ============================================================================
// 璺敱琛ㄤ笌缂栬瘧
// ============================================================================

const allRoutes: RouteDef[] = [
  ...authRoutes,
  ...mfaLoginRoutes,
  ...patientRoutes,
  ...chatRoutes,
  ...medicalRoutes,
  ...dashboardRoutes,
  ...qualityRoutes,
  ...rectificationRoutes,
  ...operationRoutes,
  ...outpatientRoutes,
  ...inpatientRoutes,
  ...inpatientCareRoutes,
  ...emergencyRoutes,
  ...pharmacyRoutes,
  ...medicalQcRoutes,
  ...voiceMedicalRoutes,
  ...frontPageRoutes,
  ...researchRoutes,
  ...empiRoutes,
  ...dataWarehouseRoutes,
  ...dataGovernanceRoutes,
  ...outboxRoutes,
  ...sessionAdminRoutes,
  ...billingRoutes,
  ...drgRoutes,
  ...labInterpretRoutes,
  ...imagingInterpretRoutes,
  ...criticalRoutes,
  ...reconRoutes,
  ...surgeryRoutes,
  ...transfusionRoutes,
  ...bloodQualityRoutes,
  ...vteRoutes,
  ...amsRoutes,
  ...pathwayRoutes,
  ...mobileNursingRoutes,
  ...nursingAdminRoutes,
  ...nursingRiskRoutes,
  ...medAdminRoutes,
  ...tubeCareRoutes,
  ...nursingEventReviewRoutes,
  ...nursingIoRoutes,
  ...nutritionScreeningRoutes,
  ...painAssessmentRoutes,
  ...preopAssessmentRoutes,
  ...pacuRecordRoutes,
  ...postopFollowupRoutes,
  ...icuSedationRoutes,
  ...postpartumRoutes,
  ...erTriageRoutes,
  ...barthelRoutes,
  ...erGreenRoutes,
  ...chronicRoutes,
  ...patientChronicRoutes,
  ...healthCheckRoutes,
  ...healthCheckReferralRoutes,
  ...oncologyRoutes,
  ...chemoReminderRoutes,
  ...psychScreeningRoutes,
  ...nissRoutes,
  ...vteAnticoagRoutes,
  ...orderCdsRoutes,
  ...nurseStationRoutes,
  ...scheduleSlotRoutes,
  ...reportPushRoutes,
  ...patientNotificationRoutes,
  ...patientBillingRoutes,
  ...rehabTreatmentRoutes,
  ...painClinicRoutes,
...cgaRoutes,
...nutritionConsultRoutes,
...stopbangRoutes,
...dischargePlanRoutes,
...dischargeSummaryRoutes,
...vitalsTrendRoutes,
...medicalArchiveRoutes,
...medicalCopyRoutes,
...admissionNoteRoutes,
...progressNoteRoutes,
...consultRequestRoutes,
...consentFormRoutes,
...orderRoutes,
...nursingRecordRoutes,
...surgeryRecordRoutes,
...medicalHeaderRoutes,
...followupApptRoutes,
...satisfactionSurveyRoutes,
...satisfactionReminderRoutes,
...mdtRoutes,
...mdtTreatmentPlanRoutes,
...piccRoutes,
...cdiRoutes,
...transfusionReactionRoutes,
...sbarRoutes,
...edObservationRoutes,
...infectionDashboardRoutes,
...amDashboardRoutes,
...doctorWorkbenchRoutes,
...patientPortalRoutes,
...surgicalChecklistRoutes,
  ...renewalRoutes,
  ...drgBudgetRoutes,
  ...inpatientCostMonitorRoutes,
  ...costAttributionRoutes,
  ...improvementTaskRoutes,
  ...improvementOutcomeRoutes,
  ...dipRoutes,
  ...paymentSelectionRoutes,
  ...settlementReportRoutes,
  ...settlementAnalyticsRoutes,
  ...settlementDrilldownRoutes,
  ...lisRoutes,
  ...risRoutes,
  ...apptRoutes,
  ...internetHospitalRoutes,
  ...consultationRoutes,
  ...internetPrescriptionRoutes,
  ...internetPaymentRoutes,
  ...internetDeliveryRoutes,
  ...satisfactionRoutes,
  ...smartTriageRoutes,
  ...delegationRoutes,
  ...referralRoutes,
  ...knowledgeBaseRoutes,
  ...agentBuilderRoutes,
  ...agentRuntimeRoutes,
  ...systemRoutes,
  ...permissionAdminRoutes,
  ...skillRoutes,
  ...tenantAdminRoutes,
  ...userAdminRoutes,
  ...roleAdminRoutes,
  ...auditLogRoutes,
  ...loginLogRoutes,
  ...imagingRoutes,
];

interface Compiled {
  method: string;
  regex: RegExp;
  keys: string[];
  def: RouteDef;
}

function compile(pattern: string): { regex: RegExp; keys: string[] } {
  const keys: string[] = [];
  const re =
    '^' +
    pattern.replace(/:([^/]+)/g, (_m, k: string) => {
      keys.push(k);
      return '([^/]+)';
    }) +
    '$';
  return { regex: new RegExp(re), keys };
}

const compiled: Compiled[] = allRoutes.map((def) => {
  const { regex, keys } = compile(def.path);
  return { method: def.method.toUpperCase(), regex, keys, def };
});

// ============================================================================
// WebSocket锛?ws/chat锛夆€?閴存潈鍚庡崌绾?// ============================================================================

const chatClients = new Set<Bun.ServerWebSocket<unknown>>();

function broadcast(event: string, payload: unknown, seq?: number): void {
  // seq 涓?outbox 鏁板瓧涓婚敭锛堜粎缁忓彂浠剁鍙戝竷鐨勪簨浠舵惡甯︼級锛屽鎴风鎹閲嶈繛琛ユ媺
  const frame = JSON.stringify({
    event,
    timestamp: Date.now(),
    payload,
    ...(seq !== undefined ? { seq } : {}),
  });
  for (const ws of chatClients) {
    try {
      ws.send(frame);
    } catch {
      chatClients.delete(ws);
    }
  }
}

// 褰卞儚 AI锛圖AMO-RADAR锛塩ritical 鍙戠幇澶嶇敤鍚屼竴 /ws/chat critical:alert 閫氶亾鎺ㄩ€佸嵄鎬ュ€?setCriticalAlertSink(broadcast);

// M7-C 浜嬪姟鎬у彂浠剁涓户锛氫笟鍔′簨鍔″啓鍏?event_outbox锛孯elay 杞鍙戝竷鍒?WebSocket銆?// publisher 澶嶇敤 broadcast锛堝悓 /ws/chat 閫氶亾锛夛紱鍙戝竷澶辫触浠呰褰曪紝涓嶅奖鍝嶄笟鍔°€?const outboxRelay = new OutboxRelay(
  (event, payload, meta) => broadcast(event, payload, meta.seq),
  {
    batchSize: 50,
    pollIntervalMs: 500,
    onPublishError: (ev, err) =>
      // eslint-disable-next-line no-console
      console.error(`[outbox-relay] 鍙戝竷浜嬩欢 ${ev.eventType}#${ev.id} 澶辫触:`, err),
  },
);
outboxRelay.start();

/** 鏍￠獙 WebSocket 鍗囩骇璇锋眰鐨?Token锛坬uery 鍙傛暟 ?token= 鎴?Sec-WebSocket-Protocol锛?*/
function wsAuthorized(req: Request): boolean {
  const url = new URL(req.url);
  const token =
    url.searchParams.get('token') ??
    (req.headers.get('sec-websocket-protocol') ?? '').replace(/^bearer\./i, '');
  if (!token) return false;
  // JWT 鏍煎紡
  if (token.split('.').length === 3) return verifyJwt(token) !== null;
  // 寮€鍙戞€佹紨绀?token
  const isProd = (process.env.NODE_ENV ?? 'development') === 'production';
  if (
    !isProd &&
    (token.startsWith('jt-') || token.startsWith('jr-') || token === 'bff-access-token')
  ) {
    return true;
  }
  return false;
}

/** 鍓嶇缁?/ws/chat 涓嬪彂鐨勫抚锛堝吋瀹?event / action銆侀《灞?/ payload 涓ょ浣嶇疆锛?*/
interface IncomingFrame {
  event?: string;
  action?: string;
  conversationId?: string;
  content?: string;
  payload?: { conversationId?: string; content?: string };
}

/**
 * agent:start 澶勭悊锛氫細璇濅笉瀛樺湪鍒欏垱寤猴紝璋冪敤 chatAggregator.runChatTurn 璺戠湡瀹?LLM锛? * 娴佸紡澧為噺缁?agent:delta 鎺ㄩ€侊紝缁撴潫鎺?agent:done锛堝け璐ユ帹 agent:error锛夈€? * 鎵€鏈夋秷鎭湪 runChatTurn 鍐呴儴钀藉簱銆? */
async function handleAgentStart(
  ws: Bun.ServerWebSocket<unknown>,
  frame: IncomingFrame,
): Promise<void> {
  const messageId = `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  let conversationId = frame.conversationId ?? frame.payload?.conversationId ?? '';
  // 鍓嶇 agent:start 閫氬父鍙甫 conversationId锛涚己鐪佽 LLM 浜у嚭鐪熷疄闂€欙紝閬垮厤绌烘秷鎭姤閿?  const content = (frame.payload?.content ?? frame.content ?? '').trim() || '鎮ㄥソ锛岃浠嬬粛涓€涓嬪仴婢滄暟鏅哄尰闄㈡櫤鑳戒綋鍙互涓烘垜鎻愪緵鍝簺涓村簥杈呭姪鑳藉姏銆?;

  const send = (event: string, payload: unknown): void => {
    try {
      ws.send(JSON.stringify({ event, timestamp: Date.now(), payload }));
    } catch {
      /* ws 宸插叧闂?*/
    }
  };

  try {
    // 浼氳瘽涓嶅瓨鍦ㄥ垯鍏堝垱寤?    let conv = conversationId ? await getConversationById(conversationId) : null;
    if (!conv) {
      conv = await createConversation({ userId: 'ws-user', title: 'WebSocket 浼氳瘽' });
      conversationId = conv.id;
      send('agent:conversation', { conversationId });
    }

    const result = await runChatTurn(conversationId, content, {
      onDelta: (delta) =>
        send('agent:delta', { conversationId, messageId, delta, done: false }),
      onToolEvent: (ev) => send('agent:tool', { conversationId, messageId, ...ev }),
    });

    if (result.error) {
      send('agent:error', {
        conversationId,
        messageId,
        code: result.error.code,
        message: result.error.message,
      });
    }
    send('agent:done', { conversationId, messageId });
  } catch (e) {
    send('agent:error', {
      conversationId,
      messageId,
      code: 'AGENT_FAILED',
      message: e instanceof Error ? e.message : String(e),
    });
    send('agent:done', { conversationId, messageId });
  }
}

// ============================================================================
// Fetch 鍏ュ彛
// ============================================================================

async function handleFetch(
  req: Request,
  server: Bun.Server<unknown>,
): Promise<Response | undefined> {
  const url = new URL(req.url);
  const startedAt = Date.now();

  // WebSocket 鍗囩骇锛堥渶閴存潈锛?  if (url.pathname === '/ws/chat' && req.headers.get('upgrade')?.toLowerCase() === 'websocket') {
    if (!wsAuthorized(req)) {
      return new Response('unauthorized', { status: 401 });
    }
    if (server.upgrade(req, { data: { path: '/ws/chat' } })) return undefined;
    return new Response('upgrade failed', { status: 426 });
  }

  // Prometheus 鎸囨爣绔偣銆傞粯璁や緷璧栧唴缃戠綉缁滅瓥鐣ラ殧绂伙紙涓嶅鍏綉鏆撮湶锛夛紱
  // 閰嶇疆 METRICS_TOKEN 鍚庡己鍒舵牎楠?Authorization: Bearer <token>銆?  if (url.pathname === '/metrics' && req.method === 'GET') {
    const expectedToken = process.env.METRICS_TOKEN;
    if (expectedToken) {
      const auth = req.headers.get('authorization') ?? '';
      if (auth !== `Bearer ${expectedToken}`) {
        return new Response('unauthorized', { status: 401 });
      }
    }
    return new Response(renderMetrics(), {
      status: 200,
      headers: { 'content-type': 'text/plain; version=0.0.4; charset=utf-8' },
    });
  }

  // 棰勮鍙栬姹備綋锛堝啓璇锋眰锛夛紝渚涘箓绛夋寚绾逛笌 handler 澶嶇敤鍚屼竴浠芥暟鎹?  const mayHaveBody = req.method !== 'GET' && req.method !== 'HEAD';
  const rawBody = mayHaveBody ? await req.text() : null;
  // 鐩磋繛瀹㈡埛绔?IP锛圔un 杩愯鏃朵粠 socket 瑙ｆ瀽锛夛紱缁忓弽鍚戜唬鐞嗘椂鍚勮矾鐢变互
  // x-forwarded-for 棣栨涓哄噯锛屾鍊间粎浣滅洿杩?鍏滃簳銆?  const socketIp = server.requestIP(req)?.address ?? null;
  const ctx: Ctx = newCtx(req, {}, url.searchParams, rawBody, socketIp);
  attachUser(ctx);
  // M7-F锛氭牎楠屼細璇濇槸鍚﹀凡鐧诲嚭/琚悐閿€锛堝紓姝ワ紝鎸?jti 鏌ヤ細璇濆彴璐︼級
  await enforceSession(ctx);

  let status = 200;
  let routeLabel = 'unmatched';
  try {
    // 闄愭祦
    const limited = rateLimit(ctx);
    if (limited) {
      status = 429;
      return withSecurityHeaders(limited);
    }

    // CSRF 鏍￠獙锛堢姸鎬佸彉鏇磋姹傦級
    const csrfDenied = verifyCsrf(ctx);
    if (csrfDenied) {
      status = 403;
      return withSecurityHeaders(csrfDenied);
    }

    // 澶氱鎴?闄㈠尯涓婁笅鏂囪В鏋愶紙鏃犳樉寮忕鎴峰ご鏃跺洖閫€榛樿绉熸埛锛涙湭鐭?鍋滅敤/瓒婃潈闄㈠尯鐭矾 403锛?    const tenantDenied = tenantContextMiddleware(ctx);
    if (tenantDenied) {
      status = 403;
      return withSecurityHeaders(tenantDenied);
    }

    for (const r of compiled) {
      if (r.method !== req.method.toUpperCase()) continue;
      const m = url.pathname.match(r.regex);
      if (!m) continue;
      const params: Record<string, string> = {};
      r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
      ctx.params = params;
      routeLabel = r.def.path;

      if (r.def.auth) {
        const denied = requireAuth(ctx);
        if (denied) {
          status = 401;
          return withSecurityHeaders(denied);
        }
      }
      const handler = r.def.handle;
      // 閿欒澶勭悊鍦ㄥ銆佸箓绛夊湪鍐咃細beginProcessing 涓?handler 浠讳綍闃舵鎶涢敊
      // 閮借浆缁撴瀯鍖栭敊璇俊灏侊紙鍚?traceId锛夛紝涓嶈繑鍥?HTML 閿欒椤?      const wrapped = withErrorHandler((c: Ctx) =>
        withIdempotency(c, () => handler(c)));
      const res = await wrapped(ctx);
      status = res.status;
      return withSecurityHeaders(res);
    }

    status = 404;
    return withSecurityHeaders(
      json(
        fail(ErrorCode.NOT_FOUND, `璺敱涓嶅瓨鍦? ${req.method} ${url.pathname}`, ctx.traceId),
        404,
      ),
    );
  } finally {
    logRequest(ctx, status, startedAt);
    recordHttpRequest({
      method: req.method,
      route: routeLabel,
      code: status,
      durationSeconds: (Date.now() - startedAt) / 1000,
    });
  }
}

// ============================================================================
// 鏁版嵁搴撳垵濮嬪寲锛堢湡瀹炴ā寮忥細杩炴帴 + 鑷姩杩佺Щ锛涙紨绀烘ā寮忥細璺宠繃骞舵槑纭憡璀︼級
// ============================================================================

const isDemoMode = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

async function initDatabase(): Promise<void> {
  if (isDemoMode) {
    console.warn('[db] DEMO_MODE=1锛氳烦杩?PostgreSQL 杩炴帴锛屼娇鐢ㄥ唴瀛樻紨绀烘暟鎹紙涓嶆寔涔呭寲锛?);
    return;
  }
  try {
    await verifyDbConnection(5, 2000);
    console.log('[db] PostgreSQL 杩炴帴鎴愬姛');
    await autoMigrate();
    console.log('[db] 鏁版嵁搴撹縼绉诲畬鎴?);
    // 鍔犺浇绉熸埛/闄㈠尯娉ㄥ唽琛ㄥ埌鍐呭瓨锛堣繍琛屾椂瑙ｆ瀽淇濇寔鍐呭瓨绾э紝鍐欐搷浣滃啓绌块€忓洖搴擄級
    const tenantCount = await tenantService.hydrate();
    console.log(`[db] 绉熸埛/闄㈠尯娉ㄥ唽琛ㄥ凡鍔犺浇锛?{tenantCount} 涓妭鐐癸級`);
  } catch (err) {
    console.error('[db] 鏁版嵁搴撳垵濮嬪寲澶辫触锛屾湇鍔℃棤娉曞惎鍔細', String(err));
    console.error('[db] 濡傞渶鏃?DB 婕旂ず锛岃璁剧疆 DEMO_MODE=1');
    process.exit(1);
  }
}

// ============================================================================
// 鍚姩
// ============================================================================

const port = Number(process.env.HTTP_PORT ?? 8080);

void initDatabase().then(() => {
  // eslint-disable-next-line no-console
  console.log(
    `[jianlan-bff] listening on http://0.0.0.0:${port}  (WebSocket /ws/chat [auth required])`,
  );
});

const server = Bun.serve({
  port,
  async fetch(req, bunServer) {
    return (await handleFetch(req, bunServer)) ?? new Response(null, { status: 101 });
  },
  websocket: {
    open(ws) {
      chatClients.add(ws);
      metrics.wsConnections.inc();
    },
    message(ws: Bun.ServerWebSocket<unknown>, raw: string | Buffer) {
      let parsed: IncomingFrame = {};
      try {
        parsed = JSON.parse(String(raw)) as IncomingFrame;
      } catch {
        /* ignore */
      }
      // 鍏煎鍓嶇浜嬩欢甯э紙event锛変笌鏃╂湡 action 甯?      const kind = parsed.event ?? parsed.action;

      if (kind === 'heartbeat' || kind === 'ping') {
        ws.send(
          JSON.stringify({ event: 'heartbeat', timestamp: Date.now(), payload: { ok: true } }),
        );
        return;
      }

      if (kind === 'agent:start' || kind === 'start_stream') {
        // 鐪熷疄 LLM 娴佸紡锛氫細璇濅笉瀛樺湪鍒欏垱寤猴紝runChatTurn 鍐呴儴钀藉簱骞跺洖璋冩帹閫?        void handleAgentStart(ws, parsed);
      }
    },
    close(ws) {
      chatClients.delete(ws);
      metrics.wsConnections.dec();
    },
  },
});

// 婕旂ず鐢細闈炵敓浜х幆澧冧笖闈?DEMO_MODE 鍛ㄦ湡鎬ф帹閫佹ā鎷熷嵄鎬ュ€煎憡璀?const isProduction = (process.env.NODE_ENV ?? 'development') === 'production';
const demoAlertTimer = isProduction || isDemoMode
  ? null
  : setInterval(() => {
      // 浜嬩欢鍚嶄笌鍓嶇 useAlert 璁㈤槄鐨?critical:alert 閫氶亾淇濇寔涓€鑷达紱
      // payload 瀵归綈鍓嶇 Alert 濂戠害锛坱ype/level/title/content/patientId锛夈€?      // 婕旂ず鍛婅浣跨敤鍥哄畾 id锛氬墠绔寜 id 鍘婚噸锛坰eenRef锛夛紝鍚屼竴瀹㈡埛绔彧寮逛竴娆★紝
      // 閬垮厤鍚屼竴鍗辨€ュ€兼瘡 30s 閲嶅寮圭獥/鍫嗙Н锛堢湡瀹炲満鏅悓涓€鍗辨€ュ€间笉搴旈噸澶嶅己鎻愰啋锛夛紱
      // 鏂拌繛鎺ョ殑瀹㈡埛绔粛浼氭敹鍒伴娆″箍鎾紝淇濈暀瀹炴椂鍛婅婕旂ず鏁堟灉銆?      broadcast('critical:alert', {
        id: 'al-demo-critical-cTni',
        type: 'critical-value',
        level: 'critical',
        title: '鑲岄挋铔嬬櫧鍗辨€ュ€?,
        content:
          '鏉?*锛圥100086锛塩TnI 鍗囬珮杈惧嵄鎬ュ€硷紝璇风珛鍗冲鏍稿苟鎸夊嵄鎬ュ€兼祦绋嬪缃紙10 鍒嗛挓鍐呭缃?+ 鍙屼汉澶嶆牳 + 绯荤粺鐧昏锛?,
        patientId: 'P100086',
        patientName: '鏉?*',
        createdAt: new Date().toISOString(),
        acknowledged: false,
      });
    }, 30_000);

// 浼橀泤鍋滄満锛氬仠姝㈡帴鏀舵柊杩炴帴銆佸叧闂紨绀哄畾鏃跺櫒涓?WS銆佸叧闂?DB 杩炴帴姹狅紝鍐嶉€€鍑?let shuttingDown = false;
function shutdown(signal: string): void {
  if (shuttingDown) return;
  shuttingDown = true;
  // eslint-disable-next-line no-console
  console.log(`[jianlan-bff] 鏀跺埌 ${signal}锛屽紑濮嬩紭闆呭仠鏈衡€);
  if (demoAlertTimer) clearInterval(demoAlertTimer);
  outboxRelay.stop();
  for (const ws of chatClients) {
    try {
      ws.close(1001, 'server shutting down');
    } catch {
      /* already closed */
    }
  }
  void server.stop(false);
  void closeDb().catch(() => { /* ignore */ });
  // 缁欏湪閫斿悓姝ュ搷搴斾竴涓瀬鐭敹灏剧獥鍙ｅ悗閫€鍑?  setTimeout(() => process.exit(0), 500);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export { broadcast, ok, server };
