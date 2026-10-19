import { readFileSync, writeFileSync } from 'fs';

const f = 'src/bff/server.ts';
let c = readFileSync(f, 'utf8');

// Fix all corrupted Chinese comments by replacing known broken patterns
const fixes: [string, string][] = [
  // Line 394-396: outbox setup
  [/\/\/ 影像 AI.*?setCriticalAlertSink\(broadcast\);/s,
   `// 影像 AI critical 发现复用同一 /ws/chat critical:alert 通道推送危急值
setCriticalAlertSink(broadcast);`],
  [/\/\/ M7-C 事务性发件箱中继：.*?const outboxRelay = new OutboxRelay\(/s,
   `// M7-C 事务性发件箱中继：业务事务写 event_outbox，Relay 轮询发布到 WebSocket
// publisher 复用 broadcast（同 /ws/chat 通道）；发布失败仅记录，不影响业务事务
const outboxRelay = new OutboxRelay(`],
  // Line 448: agent:start content
  [/\/\/ 前端 agent:start.*?const content = .*?;/s,
   `// 前端 agent:start 通常只带 conversationId；缺省让 LLM 产出真实问候，避免空消息报错
  const content = (frame.payload?.content ?? frame.content ?? '').trim() || '您好，请介绍一下健澜数智医院智能体可以为我提供哪些临床辅助能力。';`],
  // Line 459: conversation
  [/\/\/ 会话不存在则先创.*?let conv = conversationId.*?;/s,
   `// 会话不存在则先创建
    let conv = conversationId ? await getConversationById(conversationId) : null;`],
  // Line 503: WebSocket upgrade
  [/\/\/ WebSocket 升级.*?if \(url\.pathname === '\/ws\/chat'/s,
   `// WebSocket 升级（需鉴权）
  if (url.pathname === '/ws/chat'`],
  // Line 512: metrics
  [/\/\/ 配置 METRICS_TOKEN.*?if \(url\.pathname === '\/metrics'/s,
   `// 配置 METRICS_TOKEN 后强制校验 Authorization: Bearer <token>
  if (url.pathname === '/metrics'`],
  // Line 526: mayHaveBody
  [/\/\/ 预读取请求体.*?const mayHaveBody = req\.method/s,
   `// 预读取请求体（写请求），供幂等指纹与 handler 复用同一份数据
  const mayHaveBody = req.method`],
  // Line 529: socketIp
  [/\/\/ x-forwarded-for 首段为准.*?const socketIp = server\.requestIP/s,
   `// x-forwarded-for 首段为准，此值仅作直连兜底
  const socketIp = server.requestIP`],
  // Line 552: tenantDenied
  [/\/\/ 多租.*?const tenantDenied = tenantContextMiddleware/s,
   `// 多租户/院区上下文解析（无显式租户头时回退默认租户；未授权/停用/越权院区短路 403）
    const tenantDenied = tenantContextMiddleware`],
  // Line 576: wrapped
  [/\/\/ 都转结构化错误信封.*?const wrapped = withErrorHandler/s,
   `// 都转结构化错误信封（带 traceId），不返回 HTML 错误页
      const wrapped = withErrorHandler`],
  // Line 619: initDatabase demo mode
  [/console\.warn\('\[db\] DEMO_MODE=1.*?不持久化.*?\);/s,
   `console.warn('[db] DEMO_MODE=1：跳过 PostgreSQL 连接，使用内存演示数据（不持久化）');`],
  // Line 626: migration done
  [/console\.log\('\[db\] 数据库迁移完.*?\);/s,
   `console.log('[db] 数据库迁移完成');`],
  // Line 627: tenant comment
  [/\/\/ 加载租户.*?写操作写穿.*?回库/s,
   `// 加载租户/院区注册表到内存（运行时解析保持内存级，写操作写穿透回库）`],
  // Line 629: tenant count
  [/console\.log\(`\[db\] 租户.*?个节点\)`\);/s,
   `console.log(\`[db] 租户/院区注册表已加载（\${tenantCount} 个节点）\`);`],
  // Line 632: no DB demo
  [/console\.error\('\[db\] 如需.*?DEMO_MODE=1'\);/s,
   `console.error('[db] 如需无 DB 演示，请设置 DEMO_MODE=1');`],
  // Line 688-707: demo alert
  [/\/\/ 演示用：非生产环境.*?\}, 30_000\);/s,
   `// 演示用：非生产环境周期性推送模拟危急值告警
const isProduction = (process.env.NODE_ENV ?? 'development') === 'production';
const demoAlertTimer = isProduction || isDemoMode
  ? null
  : setInterval(() => {
      broadcast('critical:alert', {
        id: 'al-demo-critical-cTni',
        type: 'critical-value',
        level: 'critical',
        title: '肌钙蛋白危急值',
        content: '患者（P100086）cTnI 升高达危急值，请立即复核并按危急值流程处置（10 分钟内处理 + 双人复核 + 系统登记）',
        patientId: 'P100086',
        patientName: '张*',
        createdAt: new Date().toISOString(),
        acknowledged: false,
      });
    }, 30_000);`],
  // Line 709: shutdown comment
  [/\/\/ 优雅停机：.*?let shuttingDown = false;/s,
   `// 优雅停机
let shuttingDown = false;`],
  // Line 714: shutdown log
  [/console\.log\(`\[jianlan-bff\] 收到 \$\{signal\}.*?\`\);/s,
   `console.log(\`[jianlan-bff] 收到 \${signal}，开始优雅停机...\`);`],
];

let applied = 0;
for (const [pattern, replacement] of fixes) {
  if (pattern.test(c)) {
    c = c.replace(pattern, replacement);
    applied++;
  }
}

writeFileSync(f, c, 'utf8');
console.log(`Applied ${applied}/${fixes.length} fixes`);
