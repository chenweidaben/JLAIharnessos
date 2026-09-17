/**
 * 健澜科技数智医院智能体 - 构建脚本
 *
 * 使用 Bun.build 将 CLI 与 BFF 服务端入口打包至 dist/ 目录。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. All rights reserved.
 */

import { BunPlugin } from "bun";

// ============================================================================
// 构建配置
// ============================================================================

interface BuildEntry {
  /** 源文件路径 */
  entry: string;
  /** 输出文件名 */
  outfile: string;
  /** 是否保留JSX（Ink/React需要） */
  jsx?: boolean;
}

const entries: BuildEntry[] = [
  {
    entry: "./src/entrypoints/cli.tsx",
    outfile: "dist/cli.js",
    jsx: true,
  },
  {
    entry: "./src/bff/server.ts",
    outfile: "dist/server.js",
    jsx: false,
  },
];

// ============================================================================
// 构建执行
// ============================================================================

async function buildEntry(ent: BuildEntry): Promise<void> {
  console.log(`[build] → ${ent.entry}  ==>  ${ent.outfile}`);

  const result = await Bun.build({
    entrypoints: [ent.entry],
    outdir: "./dist",
    outfile: ent.outfile.replace(/^dist\//, ""),
    target: "bun",
    format: "esm",
    splitting: false,
    sourcemap: "external",
    minify: process.env.NODE_ENV === "production",
    define: {
      "process.env.NODE_ENV": JSON.stringify(
        process.env.NODE_ENV ?? "development"
      ),
    },
    loader: ent.jsx
      ? { ".tsx": "tsx", ".ts": "ts" }
      : { ".ts": "ts", ".tsx": "tsx" },
    external: ["react-devtools-core"],
  });

  if (!result.success) {
    console.error(`[build] ✗ ${ent.entry} 构建失败：`);
    for (const log of result.logs) {
      console.error(`       ${log}`);
    }
    process.exit(1);
  }

  console.log(`[build] ✓ ${ent.outfile} 构建成功 (${result.outputs.length} 文件)`);
  for (const out of result.outputs) {
    console.log(`       - ${out.path}`);
  }
}

// ============================================================================
// 主流程
// ============================================================================

async function main(): Promise<void> {
  console.log("=".repeat(60));
  console.log("健澜科技数智医院智能体 - 生产构建");
  console.log("=".repeat(60));
  console.log(`环境: ${process.env.NODE_ENV ?? "development"}`);
  console.log(`入口数: ${entries.length}`);
  console.log("");

  for (const ent of entries) {
    await buildEntry(ent);
    console.log("");
  }

  console.log("=".repeat(60));
  console.log("[build] 全部构建完成");
  console.log("=".repeat(60));
}

main().catch((err) => {
  console.error("[build] 构建异常:", err);
  process.exit(1);
});
