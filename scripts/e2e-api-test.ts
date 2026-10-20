/**
 * 健澜科技 jlmedaios - BFF 端到端 API 测试脚本
 *
 * 用法：bun run scripts/e2e-api-test.ts
 *
 * 测试核心 BFF 接口的连通性和鉴权状态。
 * 预期：未登录返回 401，而非 500/404。
 */

const BASE = "http://localhost:8080";

interface TestResult {
  path: string;
  status: number;
  durationMs: number;
  pass: boolean;
}

async function testEndpoint(path: string, method: string = "GET"): Promise<TestResult> {
  const start = performance.now();
  try {
    const resp = await fetch(`${BASE}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: method === "POST" ? JSON.stringify({ username: "demo", password: "demo" }) : undefined,
      signal: AbortSignal.timeout(5000),
    });
    const durationMs = Math.round(performance.now() - start);
    const pass = resp.status === 200 || resp.status === 401 || resp.status === 400;
    return { path, status: resp.status, durationMs, pass };
  } catch (err) {
    const durationMs = Math.round(performance.now() - start);
    return { path, status: 0, durationMs, pass: false };
  }
}

async function main() {
  console.log("\n=== 健澜 BFF 端到端 API 测试 ===\n");

  const endpoints: Array<{ path: string; method?: string }> = [
    { path: "/api/v1/auth/login", method: "POST" },
    { path: "/api/v1/dashboard/stats" },
    { path: "/api/v1/patients" },
    { path: "/api/v1/orders" },
    { path: "/api/v1/emergency/queue" },
    { path: "/api/v1/pharmacy/queue/dispense" },
    { path: "/api/v1/surgery/schedule?date=2026-10-20" },
    { path: "/api/v1/settlement-analytics" },
    { path: "/api/v1/improvement-tasks" },
    { path: "/api/v1/inpatient-cost-monitor" },
    { path: "/api/v1/payment-selection" },
    { path: "/api/v1/renewal/mine" },
    { path: "/api/v1/schedule-slots" },
    { path: "/api/v1/tube-care" },
  ];

  const results: TestResult[] = [];
  for (const ep of endpoints) {
    const r = await testEndpoint(ep.path, ep.method ?? "GET");
    results.push(r);
    const icon = r.pass ? "✅" : "❌";
    console.log(`${icon} ${ep.path.padEnd(45)} | ${String(r.status).padStart(4)} | ${String(r.durationMs).padStart(5)}ms`);
  }

  const passed = results.filter((r) => r.pass).length;
  const failed = results.length - passed;
  console.log(`\n=== 结果：${passed}/${results.length} 通过，${failed} 失败 ===\n`);

  if (failed > 0) {
    console.log("失败接口：");
    results.filter((r) => !r.pass).forEach((r) => {
      console.log(`  ❌ ${r.path} (status=${r.status})`);
    });
  }
}

main().catch(console.error);
