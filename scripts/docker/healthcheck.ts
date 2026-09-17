#!/usr/bin/env bun
/**
 * ============================================================================
 * 健澜科技杠OS（数智医院智能体）— 后端容器健康检查探针
 * ----------------------------------------------------------------------------
 * 文件作用：
 *   供 Dockerfile.backend 的 HEALTHCHECK 指令在容器内周期性调用。
 *   不依赖 curl/wget（distroless / debian-slim 精简镜像里通常没有这些工具），
 *   仅使用 Bun 运行时自带的全局 fetch，因此在任意包含 bun 的镜像中都可执行。
 *
 * 两种探针模式（通过命令行参数切换）：
 *   1) liveness（存活探针，默认）
 *      - 只探测本进程 HTTP 服务是否存活：GET /health
 *      - 对应 Kubernetes 的 livenessProbe，失败意味着进程需要被重启。
 *   2) readiness（就绪探针）
 *      - 探测服务是否已经可以接收流量：GET /ready
 *      - /ready 会在数据库、Redis、Kafka 等关键依赖未就绪时返回非 2xx，
 *        对应 Kubernetes 的 readinessProbe，失败仅表示暂时不要导流，不会重启。
 *
 * 约定的退出码（Docker HEALTHCHECK 规范）：
 *   0  success        健康，容器状态显示 healthy
 *   1  unhealthy      不健康，容器状态显示 unhealthy
 *   2  reserved       保留，不使用
 *
 * 环境变量：
 *   HTTP_PORT   后端 BFF 监听端口，默认 8080（与 src/bff/server.ts 保持一致）
 *   HEALTH_HOST 探针回环地址，默认 127.0.0.1（不经过网卡，避免对外暴露探测面）
 *
 * 使用示例：
 *   bun scripts/docker/healthcheck.ts           # 默认存活探针
 *   bun scripts/docker/healthcheck.ts ready     # 就绪探针
 * ============================================================================
 */

/** 探针支持的模式类型：liveness=存活，readiness=就绪 */
type ProbeMode = "liveness" | "readiness";

/**
 * 解析探针模式。
 * 仅接受第一个位置参数："ready" / "readiness" 表示就绪探针，其余一律按存活探针处理。
 * 这样设计可以保证参数异常时退化为最保守的存活检查，而不是直接报错退出。
 */
function resolveMode(argv: string[]): ProbeMode {
  const arg = (argv[2] ?? "").trim().toLowerCase();
  return arg === "ready" || arg === "readiness" ? "readiness" : "liveness";
}

/**
 * 程序主入口，async 是因为 fetch 返回 Promise。
 * 任何异常都被收敛为退出码 1，避免 HEALTHCHECK 因为未捕获异常打印堆栈造成噪音。
 */
async function main(): Promise<void> {
  const mode = resolveMode(process.argv);

  // 端口与回环地址全部来自环境变量，保证镜像在不同部署环境下无需改造。
  const port = Number(process.env.HTTP_PORT ?? 8080);
  const host = process.env.HEALTH_HOST ?? "127.0.0.1";

  // 存活探针走 /health（轻量，只看进程）；就绪探针走 /ready（会检查下游依赖）。
  const path = mode === "readiness" ? "/ready" : "/health";
  const url = `http://${host}:${port}${path}`;

  // 使用 AbortController 给单次探测设置 3 秒硬超时，
  // 防止服务卡死（accept 了连接但不返回）时探针被无限挂起。
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(url, {
      method: "GET",
      // 探针不应该被缓存，也不需要带上业务凭证。
      cache: "no-store",
      redirect: "manual",
      signal: controller.signal,
    });

    // 2xx 才视为健康；3xx/4xx/5xx 都视为不健康。
    if (response.ok) {
      // stdout 会被 docker inspect / 容器日志采集，输出一行结构化结论便于排障。
      console.log(JSON.stringify({ probe: mode, status: "healthy", path, code: response.status }));
      process.exit(0);
    }

    console.error(
      JSON.stringify({ probe: mode, status: "unhealthy", path, code: response.status, reason: "non-2xx" }),
    );
    process.exit(1);
  } catch (error) {
    // 网络拒绝、连接重置、超时（AbortError）都归为不健康。
    const reason = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ probe: mode, status: "unhealthy", path, reason }));
    process.exit(1);
  } finally {
    // 无论成功与否都清理定时器，避免事件循环被挂住导致探针进程不退出。
    clearTimeout(timer);
  }
}

// 显式执行主入口；Bun 顶层 await 也可行，但包一层 main 更利于统一错误收敛。
void main();
