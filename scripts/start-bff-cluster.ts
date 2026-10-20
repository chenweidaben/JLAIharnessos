/**
 * 健澜科技 jlmedaios - BFF 多进程集群启动脚本
 *
 * 利用 Bun 的 cluster 模式，按 CPU 核数启动 worker 进程，
 * 前置轮询负载均衡，提升 QPS 并发能力。
 *
 * 启动：bun run scripts/start-bff-cluster.ts
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { $ } from "bun";

const PORT = Number(process.env.HTTP_PORT ?? 8080);
const WORKER_COUNT = Number(process.env.WORKER_COUNT ?? navigator.hardwareConcurrency ?? 4);

console.log(`[cluster] starting BFF cluster on port ${PORT}, workers=${WORKER_COUNT}`);

// 子进程端口分配：8080, 8081, 8082, ...
const workerPorts = Array.from({ length: WORKER_COUNT }, (_, i) => PORT + i);

// 启动 worker 进程
const workers: { port: number; process: ReturnType<typeof Bun.spawn> }[] = [];

for (let i = 0; i < WORKER_COUNT; i++) {
  const port = workerPorts[i];
  const proc = Bun.spawn({
    cmd: ["C:\\Users\\lenovo\\.bun\\bin\\bun.exe", "run", "src/bff/server.ts"],
    env: {
      ...process.env,
      HTTP_PORT: String(port),
      DEMO_MODE: process.env.DEMO_MODE ?? "1",
    },
    cwd: import.meta.dir + "/..",
    stdout: "inherit",
    stderr: "inherit",
  });
  workers.push({ port, process: proc });
  console.log(`[cluster] worker ${i} started on port ${port} (pid=${proc.pid})`);
}

// 简单轮询负载均衡器（前置 Nginx 替代）
let nextWorker = 0;

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const workerPort = workerPorts[nextWorker % workerPorts.length];
    nextWorker++;

    const url = new URL(req.url);
    const target = `http://127.0.0.1:${workerPort}${url.pathname}${url.search}`;

    // 转发请求到 worker
    const headers = new Headers(req.headers);
    headers.delete("host");

    try {
      const resp = await fetch(target, {
        method: req.method,
        headers,
        body: req.body,
      });

      // 复制响应
      const responseHeaders = new Headers(resp.headers);
      return new Response(resp.body, {
        status: resp.status,
        statusText: resp.statusText,
        headers: responseHeaders,
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ code: 502, message: `Worker ${workerPort} unavailable: ${String(err)}` }),
        { status: 502, headers: { "content-type": "application/json" } },
      );
    }
  },
});

console.log(`[cluster] load balancer listening on http://0.0.0.0:${PORT}`);
console.log(`[cluster] worker ports: ${workerPorts.join(", ")}`);

// 优雅退出
process.on("SIGINT", () => {
  console.log("\n[cluster] shutting down...");
  workers.forEach((w) => w.process.kill());
  server.stop(true);
  process.exit(0);
});

process.on("SIGTERM", () => {
  workers.forEach((w) => w.process.kill());
  server.stop(true);
  process.exit(0);
});
