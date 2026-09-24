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

if (process.env.TEST_REAL !== '1') {
  process.env.DEMO_MODE = '1';
}
