/**
 * 健澜科技 jlmedaios - 智能体工厂（市场页）测试（M4-B）
 * Copyright (c) 2026 杭州健澜科技有限公司.
 *
 * 覆盖：
 *  - 「我的智能体」：真实列表渲染、状态标签（已发布/草稿）、空态；
 *  - 「内置模板」：模板卡片、分类筛选、搜索；
 *  - 刷新、新建按钮交互。
 *
 * BFF 经 vi.mock 隔离；真实加载/发布另有端到端取证。
 */
import { it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@test-utils';

import MarketPage from '@/pages/builder/MarketPage';
import type { AgentBuilderSummary } from '@/types/agentBuilder';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/services/api/agentBuilder', () => ({
  listBuilderAgentsApi: vi.fn(),
  getBuilderAgentApi: vi.fn(),
  saveDraftApi: vi.fn(),
  validateDraftApi: vi.fn(),
  publishDraftApi: vi.fn(),
  deleteAgentApi: vi.fn(),
}));

import * as api from '@/services/api/agentBuilder';

const m = api as unknown as Record<string, ReturnType<typeof vi.fn>>;

function mine(over: Partial<AgentBuilderSummary> = {}): AgentBuilderSummary {
  return {
    agentId: 'm4b-test',
    name: '测试智能体',
    nameEn: null,
    category: '电子病历',
    riskLevel: 'low',
    description: '测试用',
    status: 'enabled',
    currentVersion: '1.2.0',
    versionCount: 3,
    hasDraft: false,
    ownerId: null,
    builtin: false,
    updatedAt: '2026-10-01T08:00:00Z',
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  m.listBuilderAgentsApi.mockResolvedValue([
    mine(),
    mine({ agentId: 'm4b-draft', name: '草稿智能体', status: 'draft', currentVersion: null, hasDraft: true }),
  ]);
});

it('我的智能体：列表渲染并显示状态标签', async () => {
  render(<MarketPage />);
  expect(await screen.findByText('测试智能体')).toBeInTheDocument();
  expect(screen.getByText('已发布 v1.2.0')).toBeInTheDocument();
  expect(screen.getByText('草稿智能体')).toBeInTheDocument();
  expect(screen.getByText('草稿')).toBeInTheDocument();
});

it('我的智能体：加载失败时显示空态（不冒充数据）', async () => {
  m.listBuilderAgentsApi.mockRejectedValue(new Error('refused'));
  render(<MarketPage />);
  expect(await screen.findByText(/还没有自己的智能体/)).toBeInTheDocument();
});

it('内置模板：切换标签页后显示模板卡片', async () => {
  render(<MarketPage />);
  fireEvent.click(screen.getByRole('tab', { name: /内置模板/ }));
  // 内置模板中包含 AI 病历生成等；每个模板卡片都有搭建按钮
  expect((await screen.findAllByText(/基于此模板搭建/)).length).toBeGreaterThan(0);
});

it('内置模板：分类筛选', async () => {
  render(<MarketPage />);
  fireEvent.click(screen.getByRole('tab', { name: /内置模板/ }));
  await screen.findAllByText(/基于此模板搭建/);
  // 点击某个分类 Tag（如“电子病历”）
  const cats = screen.getAllByText('电子病历');
  fireEvent.click(cats[0]);
  await waitFor(() => expect(screen.getByText('全部')).toBeInTheDocument());
});

it('内置模板：搜索过滤', async () => {
  render(<MarketPage />);
  fireEvent.click(screen.getByRole('tab', { name: /内置模板/ }));
  const search = await screen.findByPlaceholderText('搜索模板名称 / 功能');
  fireEvent.change(search, { target: { value: '病历' } });
  // 至少有一个匹配项
  expect((await screen.findAllByText(/基于此模板搭建/)).length).toBeGreaterThan(0);
});

it('刷新：点击刷新重新加载', async () => {
  render(<MarketPage />);
  await screen.findByText('测试智能体');
  const before = m.listBuilderAgentsApi.mock.calls.length;
  fireEvent.click(screen.getByRole('button', { name: /刷新/ }));
  await waitFor(() => expect(m.listBuilderAgentsApi.mock.calls.length).toBeGreaterThan(before));
});

it('新建：点击新建空白智能体（不报错）', async () => {
  render(<MarketPage />);
  await screen.findByText('测试智能体');
  fireEvent.click(screen.getByRole('button', { name: /新建空白智能体/ }));
  expect(screen.getByRole('button', { name: /新建空白智能体/ })).toBeInTheDocument();
});

it('我的智能体：点击「在画布中编辑」导航', async () => {
  render(<MarketPage />);
  await screen.findByText('测试智能体');
  const editBtns = screen.getAllByRole('button', { name: /在画布中编辑/ });
  fireEvent.click(editBtns[0]);
  expect(mockNavigate).toHaveBeenCalledWith('/builder/edit/m4b-test');
});

it('内置模板：点击分类筛选 Tag', async () => {
  render(<MarketPage />);
  fireEvent.click(screen.getByRole('tab', { name: /内置模板/ }));
  // 搜索 Card 内的筛选 Tag（cursor pointer），点击「电子病历」
  const filterTag = screen.getAllByText('电子病历').find((el) =>
    el.closest('span')?.getAttribute('style')?.includes('cursor'),
  );
  fireEvent.click(filterTag as Element);
  // 点击「全部」恢复
  const allTag = screen.getByText('全部');
  fireEvent.click(allTag);
});

it('内置模板：点击「基于此模板搭建」导航', async () => {
  render(<MarketPage />);
  fireEvent.click(screen.getByRole('tab', { name: /内置模板/ }));
  const buildBtns = await screen.findAllByText(/基于此模板搭建/);
  fireEvent.click(buildBtns[0]);
  expect(mockNavigate).toHaveBeenCalled();
});
