/**
 * 健澜科技数智医院智能体 - 测试环境预加载（bunfig.toml [test].preload）
 *
 * 职责：保证单元/场景/性能测试的确定性与进程级隔离。
 *
 * 背景：tests/unit、tests/integration/scenario*、tests/performance 下的用例
 * 基于内置只读演示主数据（mockData / drugCatalog 中的 P2026090001 等编号）
 * 编写，属于"不依赖外部数据库状态"的确定性测试。若继承开发机 .env 的
 * DEMO_MODE=0 与 DATABASE_URL，它们会误打真实库，既因编号体系不同而失败，
 * 也违反单元测试隔离原则。真实持久化的覆盖由
 * tests/integration/real-persistence.test.ts 直接连接数据库完成（该文件
 * 不经过 DEMO_MODE 分支，DATABASE_URL 可用时跑真实 CRUD，不可用时自动跳过）。
 *
 * 因此这里默认把测试进程切到演示模式；如确需让全量用例尝试真实模式
 * （仅限具备对应种子数据的环境），可设置 TEST_REAL=1 关闭本默认行为。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { afterAll } from 'bun:test';
import { closeDbForTest } from '../../src/db/pool.js';

if (process.env.TEST_REAL !== '1') {
  process.env.DEMO_MODE = '1';
}

// 进程级连接池兜底（测试基础设施层，不改动生产池上限/重连策略）：
//
// 背景：bun test 在单进程内顺序执行多个测试文件，主池为模块级单例，跨文件
// 复用。逐文件 afterAll 关池是约定而非强制；若某文件漏关，残留连接会留在池内，
// 进程退出时可能形成句柄泄漏或进程悬挂。实证 bun 1.2.0 中，在 preload 模块
// 注册的 afterAll 钩子在整轮测试结束后全局执行一次（非每文件一次），适合作为
// 最后一道安全网。
//
// closeDbForTest 在 _sql 为 null 时直接返回：纯 mock/unit 进程从未 getDb()，
// 不建池、无副作用；真实模式进程在所有文件收尾后优雅关闭主池。afterEach 级别
// 统一回收不可行（M48-A：bun 1.2 Windows afterEach 阶段主池读循环不 pump，
// 池上查询会永久挂起），故兜底只挂进程末尾 afterAll，不介入用例之间。
afterAll(async () => {
  await closeDbForTest();
});
