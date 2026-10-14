/**
 * 健澜科技 jlmedaios - 前端关键页面冒烟测试（bun:test）
 *
 * 目的：验证登录 / Dashboard / MedMuseChat / 审批中心 Approvals / 患者360
 * 五个关键页面在 shallow mount（ReactDOMServer.renderToString）首帧渲染时
 * 不抛错、不白屏。不启动完整 router、不发真实请求。
 *
 * 做法：
 *   - 用 devDependencies 中已存在的 jsdom 提供最小 DOM 全局；
 *   - mock react-router-dom（useNavigate / useParams 不需要真实 Router 上下文）；
 *   - mock @/components/charts（避免 echarts 在 SSR 阶段初始化 canvas）；
 *   - 页面组件依赖的 axios / zustand store 仅在事件回调或 useEffect 中触发请求，
 *     renderToString 不执行 useEffect，因此无需 mock；
 *   - 不修改任何业务页面源码，不新增依赖。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 */
import { beforeAll, describe, expect, mock, test } from 'bun:test';
// react / react-dom 位于 web/node_modules（web/package.json dependencies）。
// 本测试文件位于仓库根 tests/web/，Bun 从文件位置向上解析 node_modules 时
// 直达不到 web/node_modules，因此用相对路径显式引入，确保与业务页面解析到
// 同一份 React 实例（避免双 React）。不新增任何依赖。
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as React from '../../web/node_modules/react';
// jsdom 已在 web/package.json devDependencies（web/node_modules/jsdom）。
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { JSDOM } from '../../web/node_modules/jsdom';

/* ------------------------------------------------------------------ */
/* 1. 建立最小 DOM 全局（必须在 import React / 业务模块之前完成）        */
/* ------------------------------------------------------------------ */
const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost/',
  pretendToBeVisual: true,
});
const win = dom.window as unknown as Record<string, unknown>;

(globalThis as Record<string, unknown>).window = dom.window;
(globalThis as Record<string, unknown>).document = dom.window.document;
(globalThis as Record<string, unknown>).navigator = dom.window.navigator;
(globalThis as Record<string, unknown>).HTMLElement = dom.window.HTMLElement;
(globalThis as Record<string, unknown>).Element = dom.window.Element;
(globalThis as Record<string, unknown>).Node = dom.window.Node;
(globalThis as Record<string, unknown>).CustomEvent = dom.window.CustomEvent;
(globalThis as Record<string, unknown>).Event = dom.window.Event;
(globalThis as Record<string, unknown>).MouseEvent = dom.window.MouseEvent;
(globalThis as Record<string, unknown>).KeyboardEvent = dom.window.KeyboardEvent;
(globalThis as Record<string, unknown>).localStorage = dom.window.localStorage;
(globalThis as Record<string, unknown>).sessionStorage = dom.window.sessionStorage;
(globalThis as Record<string, unknown>).getComputedStyle =
  dom.window.getComputedStyle.bind(dom.window);
(globalThis as Record<string, unknown>).requestAnimationFrame = (cb: FrameRequestCallback) =>
  setTimeout(() => cb(Date.now()), 0) as unknown as number;
(globalThis as Record<string, unknown>).cancelAnimationFrame = (id: number) => clearTimeout(id);

// antd v5 响应式断点依赖 matchMedia，jsdom 默认不提供，给一个最小 shim
if (typeof (dom.window as { matchMedia?: unknown }).matchMedia !== 'function') {
  (dom.window as Record<string, unknown>).matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  });
}
(globalThis as Record<string, unknown>).matchMedia = (
  dom.window as unknown as { matchMedia: (q: string) => MediaQueryList }
).matchMedia;

// ResizeObserver / MutationObserver 占位（部分 antd 组件在 useEffect 里引用，
// renderToString 不执行 effect，但占位可避免极个别模块顶层探测时报错）
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as Record<string, unknown>).ResizeObserver =
  (globalThis as Record<string, unknown>).ResizeObserver ?? ResizeObserverStub;
class MutationObserverStub {
  observe() {}
  disconnect() {}
  takeRecords() {
    return [] as unknown[];
  }
}
(globalThis as Record<string, unknown>).MutationObserver =
  (globalThis as Record<string, unknown>).MutationObserver ?? MutationObserverStub;

/* ------------------------------------------------------------------ */
/* 2. mock 外部依赖                                                      */
/* ------------------------------------------------------------------ */

// 2.1 react-router-dom：页面用到 useNavigate / useParams；
//     不挂真实 Router，直接给稳定桩。
mock.module('react-router-dom', () => ({
  useNavigate: () => () => undefined,
  useParams: () => ({ id: 'demo-patient-001' }),
  useLocation: () => ({ pathname: '/', search: '', hash: '', state: null }),
  useRoutes: () => null,
  Link: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('a', null, children),
  NavLink: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('a', null, children),
  Outlet: () => null,
}));

// 2.2 @/components/charts：echarts 在 SSR 下会尝试访问 canvas/measure，
//     这里替换成轻量占位，只验证页面骨架不白屏。
mock.module('@/components/charts', () => ({
  LineChart: () => React.createElement('div', { 'data-testid': 'line-chart' }),
  BarChart: () => React.createElement('div', { 'data-testid': 'bar-chart' }),
  PieChart: () => React.createElement('div', { 'data-testid': 'pie-chart' }),
  GaugeChart: () => React.createElement('div', { 'data-testid': 'gauge-chart' }),
}));

/* ------------------------------------------------------------------ */
/* 3. 动态导入被测页面（在 mock / DOM 就绪后）                            */
/* ------------------------------------------------------------------ */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pages: Record<string, any> = {};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ReactDOMServer: any;

beforeAll(async () => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  ReactDOMServer = await import('../../web/node_modules/react-dom/server.node.js');
  // 页面用相对路径引入（tests/web/ -> web/src）；页面文件内部的 `@/` 别名
  // 由 Bun 根据 web/tsconfig.json（baseUrl=web）解析为 web/src。
  const [login, dashboard, medmuse, approvals, patient360] = await Promise.all([
    import('../../web/src/pages/login'),
    import('../../web/src/pages/dashboard'),
    import('../../web/src/pages/agent/MedMuseChatPage'),
    import('../../web/src/pages/medmuse/Approvals'),
    import('../../web/src/pages/patients/Patient360'),
  ]);
  pages = {
    Login: (login as { default: React.ComponentType }).default,
    Dashboard: (dashboard as { default: React.ComponentType }).default,
    MedMuseChat: (medmuse as { default: React.ComponentType }).default,
    Approvals: (approvals as { default: React.ComponentType }).default,
    Patient360: (patient360 as { default: React.ComponentType }).default,
  };
});

/* ------------------------------------------------------------------ */
/* 4. 用例：renderToString 不抛错即视为"不白屏"                          */
/* ------------------------------------------------------------------ */
function renderPage(name: string): string {
  const Component = pages[name];
  if (!Component) throw new Error(`页面组件未加载: ${name}`);
  // renderToString 内部若渲染抛错会直接 throw，用例即失败
  const html = ReactDOMServer.renderToString(React.createElement(Component));
  if (typeof html !== 'string' || html.length === 0) {
    throw new Error(`页面 ${name} 渲染结果为空字符串（疑似白屏）`);
  }
  return html;
}

describe('健澜科技 jlmedaios · 关键页面冒烟（不白屏）', () => {
  test('登录页渲染不抛错', () => {
    const html = renderPage('Login');
    // 登录按钮文案在 JSX 中为「登 录」（带空格，配合 letterSpacing）
    expect(html).toContain('登 录');
    expect(html).toContain('健澜科技');
    expect(html).toContain('jlmedaios');
  });

  test('Dashboard 院长驾驶舱渲染不抛错', () => {
    const html = renderPage('Dashboard');
    expect(html).toContain('院长驾驶舱');
  });

  test('MedMuseChat 岗位智能体聊天页渲染不抛错', () => {
    const html = renderPage('MedMuseChat');
    expect(html).toContain('MEDMUSE');
  });

  test('审批中心 Approvals 渲染不抛错', () => {
    const html = renderPage('Approvals');
    expect(html).toContain('审批中心');
  });

  test('患者360 时间线页渲染不抛错', () => {
    const html = renderPage('Patient360');
    expect(html).toContain('患者360');
  });
});
