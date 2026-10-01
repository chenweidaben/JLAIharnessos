/**
 * 健澜科技 jlmedaios - 知识库管理页面测试（M4-A）
 * Copyright (c) 2026 杭州健澜科技有限公司.
 *
 * 覆盖：
 *  - 在线：知识库列表、选择 KB 加载文档、摄入文档、新建 KB；
 *  - 检索测试：输入查询后展示带来源的结果；
 *  - 断库：显式离线 Alert，不渲染业务内容。
 *
 * BFF 经 vi.mock 隔离；真实断库/HTTP 另有端到端取证。
 */
import { it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@test-utils';

import KnowledgeBasePage from '@/pages/knowledgeBase';
import type {
  KnowledgeBase,
  KnowledgeDocument,
  RetrievalResult,
} from '@/types/knowledgeBase';

vi.mock('@/services/api/knowledgeBase', () => ({
  listKbsApi: vi.fn(),
  createKbApi: vi.fn(),
  getKbApi: vi.fn(),
  updateKbApi: vi.fn(),
  deleteKbApi: vi.fn(),
  listDocumentsApi: vi.fn(),
  ingestDocumentApi: vi.fn(),
  retrieveApi: vi.fn(),
}));
vi.mock('@/services/api/pharmacy', () => ({ getSystemHealth: vi.fn() }));

import * as api from '@/services/api/knowledgeBase';
import { getSystemHealth } from '@/services/api/pharmacy';

const m = api as unknown as Record<string, ReturnType<typeof vi.fn>>;
const healthMock = vi.mocked(getSystemHealth);

function kb(over: Partial<KnowledgeBase> = {}): KnowledgeBase {
  return {
    id: 'm4a-test',
    name: 'M4A 测试库',
    description: '测试',
    authorityLevel: 'general',
    source: '院内',
    license: '院内私有',
    version: '1.0.0',
    enabled: true,
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
    ...over,
  };
}

function doc(over: Partial<KnowledgeDocument> = {}): KnowledgeDocument {
  return {
    id: 'doc1',
    kbId: 'm4a-test',
    title: '二甲双胍用药须知',
    author: 'test',
    publisher: null,
    publishDate: null,
    version: '1.0.0',
    docType: 'guideline',
    authorityLevel: null,
    sourceUrl: null,
    license: null,
    content: '二甲双胍禁忌证内容',
    status: 'ready',
    metadata: {},
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
    ...over,
  };
}

function result(over: Partial<RetrievalResult> = {}): RetrievalResult {
  return {
    chunkId: 'c1',
    kbId: 'm4a-test',
    documentId: 'doc1',
    documentTitle: '二甲双胍用药须知',
    sectionPath: '禁忌证',
    content: '二甲双胍禁用于严重肾功能不全患者。',
    score: 0.82,
    vectorScore: 0.9,
    keywordScore: 0.6,
    publisher: null,
    author: 'test',
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  healthMock.mockResolvedValue({ status: 'ok', db: 'up' });
  m.listKbsApi.mockResolvedValue([kb()]);
  m.listDocumentsApi.mockResolvedValue([doc()]);
  m.deleteKbApi.mockResolvedValue({ deleted: 'x' });
  m.ingestDocumentApi.mockResolvedValue({
    document: doc(),
    chunkCount: 3,
    embeddingProvider: 'local-demo',
  });
  m.createKbApi.mockResolvedValue(kb());
  m.retrieveApi.mockResolvedValue([result()]);
});

async function waitOnline() {
  return screen.findByTestId('kb-content');
}

it('在线：知识库列表显示', async () => {
  render(<KnowledgeBasePage />);
  await waitOnline();
  expect(await screen.findByText('M4A 测试库')).toBeInTheDocument();
});

it('选择知识库后加载文档', async () => {
  render(<KnowledgeBasePage />);
  await waitOnline();
  fireEvent.click(await screen.findByText('M4A 测试库'));
  await waitFor(() => expect(m.listDocumentsApi).toHaveBeenCalledWith('m4a-test'));
  expect(await screen.findByText('二甲双胍用药须知')).toBeInTheDocument();
});

it('文档管理：摄入文档', async () => {
  render(<KnowledgeBasePage />);
  await waitOnline();
  fireEvent.click(await screen.findByText('M4A 测试库'));
  await screen.findByText('二甲双胍用药须知');

  fireEvent.change(screen.getByPlaceholderText('文档标题'), {
    target: { value: '新文档' },
  });
  fireEvent.change(screen.getByPlaceholderText('粘贴文档全文或 Markdown'), {
    target: { value: '这是一份包含足够内容的测试文档正文用于摄入。' },
  });
  fireEvent.click(screen.getByText('解析并摄入'));
  await waitFor(() => expect(m.ingestDocumentApi).toHaveBeenCalledTimes(1));
});

it('检索测试：输入查询后展示带来源结果', async () => {
  render(<KnowledgeBasePage />);
  await waitOnline();
  fireEvent.click(screen.getByText('检索测试'));

  const queryInput = await screen.findByPlaceholderText('输入问题，如：二甲双胍的禁忌证是什么？');
  fireEvent.change(queryInput, {
    target: { value: '二甲双胍禁忌' },
  });
  fireEvent.keyDown(queryInput, { key: 'Enter', code: 'Enter' });
  await waitFor(() => expect(m.retrieveApi).toHaveBeenCalledTimes(1));
  expect(await screen.findByTestId('kb-results')).toBeInTheDocument();
  expect(await screen.findByText('二甲双胍禁用于严重肾功能不全患者。')).toBeInTheDocument();
});

it('新建知识库', async () => {
  render(<KnowledgeBasePage />);
  await waitOnline();
  fireEvent.click(screen.getByText('新建'));

  fireEvent.change(screen.getByPlaceholderText('如 cardiology-notes'), {
    target: { value: 'new-kb' },
  });
  fireEvent.change(screen.getByPlaceholderText('如 心内科笔记库'), {
    target: { value: '新库' },
  });
  fireEvent.click(screen.getByText('创 建'));
  await waitFor(() => expect(m.createKbApi).toHaveBeenCalledTimes(1));
});

it('刷新：点击刷新重新探活并加载', async () => {
  render(<KnowledgeBasePage />);
  await waitOnline();
  const before = m.listKbsApi.mock.calls.length;
  fireEvent.click(screen.getByRole('button', { name: /刷新/ }));
  await waitFor(() => expect(m.listKbsApi.mock.calls.length).toBeGreaterThan(before));
});

it('删除知识库：确认后调用删除', async () => {
  render(<KnowledgeBasePage />);
  await waitOnline();
  await screen.findByText('M4A 测试库');

  // 点击列表项的删除链接（antd Button 文本包在 span 中）
  const delBtn = screen
    .getAllByRole('button')
    .find((b) => b.textContent?.trim() === '删除');
  expect(delBtn).toBeTruthy();
  fireEvent.click(delBtn!);
  // 等待确认弹窗，点击其主按钮（okText 为“删除”）
  await waitFor(() =>
    expect(document.querySelector('.ant-modal-confirm-btns')).toBeTruthy(),
  );
  const okBtn = document.querySelector(
    '.ant-modal-confirm-btns .ant-btn-primary',
  ) as HTMLElement;
  fireEvent.click(okBtn);
  await waitFor(() => expect(m.deleteKbApi).toHaveBeenCalledWith('m4a-test'));
});

it('断库：显示离线 Alert', async () => {
  healthMock.mockRejectedValue(new Error('refused'));
  render(<KnowledgeBasePage />);
  expect(await screen.findByTestId('kb-offline-alert')).toBeInTheDocument();
  expect(screen.queryByTestId('kb-content')).not.toBeInTheDocument();
});
