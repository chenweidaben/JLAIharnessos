/**
 * 健澜科技数智医院智能体 - 测试作用域：强制使用内置演示数据
 *
 * 背景：bun test 全量在【单进程】内顺序执行所有测试文件，全局 process.env 与
 * 数据库连接池跨文件共享。纯 mock/确定性测试（医疗工具单测、场景流程、性能
 * 基线）不依赖真实数据库，无论默认口径还是 TEST_REAL=1 口径都应走内置演示
 * 数据；否则在 TEST_REAL=1 下会误连真实库，用演示数据 ID 打库而失败。
 *
 * 用法：在测试文件顶部（import 之后）调用一次 useMockData()。它会把
 * DEMO_MODE 临时置为 1，并在 afterAll 还原为该文件进入前的值，不污染后续
 * 真实库测试文件。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */
import { afterAll } from 'bun:test';

export function useMockData(): void {
  const previous = process.env.DEMO_MODE;
  process.env.DEMO_MODE = '1';
  afterAll(() => {
    if (previous === undefined) {
      delete process.env.DEMO_MODE;
    } else {
      process.env.DEMO_MODE = previous;
    }
  });
}
