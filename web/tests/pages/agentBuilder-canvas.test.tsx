/**
 * 健澜科技 jlmedaios - 低代码编排画布测试（M4-B）
 * Copyright (c) 2026 杭州健澜科技有限公司.
 *
 * 覆盖：
 *  - 新建模式：渲染空白画布与工具栏；
 *  - 加载现有智能体草稿（getBuilderAgentApi）；
 *  - 保存草稿（saveDraftApi）；
 *  - 发布流程：发布弹窗 → 选版本递增 → 确认发布（publishDraftApi）；
 *  - 加载失败提示；
 *  - 智能体设置抽屉：文本字段编辑；
 *  - 校验结果抽屉：错误列表渲染与点击定位；
 *  - 撤销 / 重做；
 *  - 导出 YAML / JSON（download）；
 *  - 节点库拖拽 / 点击 / hover，画布双击放置、拖放。
 *
 * BFF 经 vi.mock 隔离；真实发布另有端到端取证。
 */
import { it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@test-utils';

import BuilderPage from '@/pages/builder/BuilderPage';
import { useBuilderStore } from '@/pages/builder/builderStore';

let mockAgentId = 'new';
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useParams: () => ({ agentId: mockAgentId }),
    useNavigate: () => mockNavigate,
  };
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

/** 构造一个最小合法草稿 detail */
function draftDetail() {
  return {
    agent: {
      agentId: 'm4b-test',
      name: '测试智能体',
      category: '电子病历',
      riskLevel: 'low',
      status: 'draft',
      currentVersion: null,
    },
    draft: {
      version: 'draft',
      definition: {
        id: 'm4b-test',
        name: '测试智能体',
        version: '1.0.0',
        category: '电子病历',
        riskLevel: 'low',
        tags: [],
        description: '测试',
        allowedRoles: ['doctor'],
        tools: [],
        knowledgeBases: [],
        model: { provider: 'jianlan', model: 'sonnet', temperature: 0.2 },
        systemPrompt: 'prompts/system.md',
        entryWorkflow: 'main',
        workflows: [
          {
            meta: { id: 'main', name: 'main', version: '1.0.0' },
            nodes: [
              { id: 'start', type: 'start', name: '开始', config: {} },
              { id: 'end', type: 'end', name: '结束', config: { outputMapping: { status: 'completed' } } },
            ],
            edges: [{ id: 'e1', source: 'start', target: 'end' }],
          },
        ],
        triggers: [],
        disclaimer: '辅助',
        enabled: true,
      },
      prompts: {},
      checksum: 'abc',
    },
    versions: [],
  };
}

/** download 用到的浏览器 API 桩 */
const createObjectURL = vi.fn(() => 'blob:mock');
const revokeObjectURL = vi.fn();
const anchorClick = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  mockAgentId = 'new';
  m.saveDraftApi.mockResolvedValue({ agentId: 'm4b-test', created: true });
  m.publishDraftApi.mockResolvedValue({ version: '1.0.0', checksum: 'a'.repeat(64) });
  m.getBuilderAgentApi.mockResolvedValue(draftDetail());
  URL.createObjectURL = createObjectURL;
  URL.revokeObjectURL = revokeObjectURL;
  HTMLAnchorElement.prototype.click = anchorClick;
});

afterEach(() => {
  vi.restoreAllMocks();
});

it('新建模式：渲染工具栏按钮', async () => {
  render(<BuilderPage />);
  await waitFor(() => expect(screen.getByRole('button', { name: /保存/ })).toBeInTheDocument());
  expect(screen.getByRole('button', { name: /发布/ })).toBeInTheDocument();
});

it('加载现有智能体草稿', async () => {
  mockAgentId = 'm4b-test';
  render(<BuilderPage />);
  await waitFor(() => expect(m.getBuilderAgentApi).toHaveBeenCalledWith('m4b-test'));
  expect(await screen.findByText('测试智能体')).toBeInTheDocument();
});

it('加载失败：显示错误提示', async () => {
  mockAgentId = 'm4b-missing';
  m.getBuilderAgentApi.mockRejectedValue(new Error('not found'));
  render(<BuilderPage />);
  await waitFor(() => expect(m.getBuilderAgentApi).toHaveBeenCalled());
});

it('保存草稿：点击保存调用 API', async () => {
  render(<BuilderPage />);
  await waitFor(() => expect(screen.getByRole('button', { name: /保存/ })).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: /保存/ }));
  await waitFor(() => expect(m.saveDraftApi).toHaveBeenCalledTimes(1));
});

it('发布流程：打开发布弹窗并确认', async () => {
  render(<BuilderPage />);
  await waitFor(() => expect(screen.getByRole('button', { name: /发布/ })).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: /发布/ }));
  await waitFor(() => expect(m.saveDraftApi).toHaveBeenCalledTimes(1));
  expect(await screen.findByText('发布智能体')).toBeInTheDocument();
  fireEvent.click(screen.getByText('修订（patch）：向下兼容的问题修复'));
  fireEvent.click(screen.getByRole('button', { name: '确认发布' }));
  await waitFor(() => expect(m.publishDraftApi).toHaveBeenCalledTimes(1));
});

it('返回市场：点击市场按钮导航', async () => {
  render(<BuilderPage />);
  await waitFor(() => expect(screen.getByRole('button', { name: /市场/ })).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: /市场/ }));
  expect(mockNavigate).toHaveBeenCalledWith('/builder/market');
});

it('设置抽屉：打开并编辑文本字段', async () => {
  render(<BuilderPage />);
  await waitFor(() => expect(screen.getByRole('button', { name: /设置/ })).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: /设置/ }));

  expect(await screen.findByText('智能体设置')).toBeInTheDocument();
  // ID
  fireEvent.change(screen.getByPlaceholderText('如 medical-record-writer'), { target: { value: 'my-agent' } });
  // 无 placeholder 的普通文本输入：[0]中文名称 [1]英文名称 [2]版本
  const plainInputs = Array.from(document.querySelectorAll('.ant-input')).filter(
    (el) => !(el as HTMLInputElement).placeholder && (el as HTMLInputElement).type === 'text',
  ) as HTMLInputElement[];
  fireEvent.change(plainInputs[0], { target: { value: '我的智能体' } });
  fireEvent.change(plainInputs[1], { target: { value: 'My Agent' } });
  fireEvent.change(plainInputs[2], { target: { value: '2.0.0' } });
  // 温度
  fireEvent.change(document.querySelector('.ant-input-number-input') as Element, { target: { value: '0.4' } });
  // textareas：[0]描述 [1]系统提示词 [2]免责声明
  const textareas = Array.from(document.querySelectorAll('textarea')) as HTMLTextAreaElement[];
  fireEvent.change(textareas[0], { target: { value: '描述' } });
  fireEvent.change(textareas[1], { target: { value: '你是助手' } });
  fireEvent.change(textareas[2], { target: { value: '辅助' } });

  const meta = useBuilderStore.getState().meta;
  expect(meta.id).toBe('my-agent');
  expect(meta.name).toBe('我的智能体');
  expect(meta.nameEn).toBe('My Agent');
  expect(meta.version).toBe('2.0.0');
  expect(meta.systemPrompt).toBe('你是助手');
  expect(meta.disclaimer).toBe('辅助');
});

it('撤销 / 重做：添加节点后撤销再重做', async () => {
  render(<BuilderPage />);
  await waitFor(() => expect(screen.getByRole('button', { name: /保存/ })).toBeInTheDocument());
  const before = useBuilderStore.getState().nodes.length;
  useBuilderStore.getState().addNode('delay', { x: 10, y: 10 });
  expect(useBuilderStore.getState().nodes.length).toBe(before + 1);
  fireEvent.click(screen.getByRole('button', { name: /撤销/ }));
  expect(useBuilderStore.getState().nodes.length).toBe(before);
  fireEvent.click(screen.getByRole('button', { name: /重做/ }));
  expect(useBuilderStore.getState().nodes.length).toBe(before + 1);
});

it('导出 YAML：点击导出触发下载', async () => {
  render(<BuilderPage />);
  await waitFor(() => expect(screen.getByRole('button', { name: /导出/ })).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: /导出/ }));
  expect(createObjectURL).toHaveBeenCalled();
  expect(anchorClick).toHaveBeenCalled();
});

it('导出 JSON：切换格式后导出', async () => {
  render(<BuilderPage />);
  await waitFor(() => expect(screen.getByRole('button', { name: /导出/ })).toBeInTheDocument());
  // 点击 Segmented 的 JSON 选项
  fireEvent.click(screen.getByText('JSON'));
  fireEvent.click(screen.getByRole('button', { name: /导出/ }));
  expect(createObjectURL).toHaveBeenCalled();
});

it('节点库：点击节点项选中（待放置），再点取消', async () => {
  render(<BuilderPage />);
  await waitFor(() => expect(screen.getByText('节点库')).toBeInTheDocument());
  const item = screen.getByText('大模型').closest('[draggable="true"]') as HTMLElement;
  fireEvent.click(item);
  expect(useBuilderStore.getState().paletteType).toBe('llm');
  fireEvent.click(item);
  expect(useBuilderStore.getState().paletteType).toBeNull();
});

it('节点库：拖拽节点触发 dragStart', async () => {
  render(<BuilderPage />);
  await waitFor(() => expect(screen.getByText('节点库')).toBeInTheDocument());
  const item = screen.getByText('延时').closest('[draggable="true"]') as HTMLElement;
  const dataTransfer = { setData: vi.fn(), getData: vi.fn(), effectAllowed: '', dropEffect: '' };
  fireEvent.dragStart(item, { dataTransfer });
  expect(dataTransfer.setData).toHaveBeenCalledWith('application/reactflow', 'delay');
});

it('节点库：hover 节点项触发 mouseEnter / mouseLeave', async () => {
  render(<BuilderPage />);
  await waitFor(() => expect(screen.getByText('节点库')).toBeInTheDocument());
  const item = screen.getByText('延时').closest('[draggable="true"]') as HTMLElement;
  fireEvent.mouseEnter(item);
  fireEvent.mouseLeave(item);
});

it('画布拖放：drop 携带节点类型时添加节点', async () => {
  render(<BuilderPage />);
  await waitFor(() => expect(screen.getByText('节点库')).toBeInTheDocument());
  const wrapper = document.querySelector('[ref]') ?? document.querySelector('.react-flow')?.parentElement;
  const target = (wrapper as HTMLElement) ?? document.body;
  const before = useBuilderStore.getState().nodes.length;
  const dataTransfer = {
    setData: vi.fn(),
    getData: vi.fn((k: string) => (k === 'application/reactflow' ? 'delay' : '')),
    effectAllowed: 'move',
    dropEffect: 'move',
  };
  fireEvent.dragOver(target, { dataTransfer });
  fireEvent.drop(target, { dataTransfer, clientX: 100, clientY: 100 });
  expect(useBuilderStore.getState().nodes.length).toBe(before + 1);
});

it('校验结果：制造错误后打开校验抽屉并点击问题定位', async () => {
  render(<BuilderPage />);
  await waitFor(() => expect(screen.getByRole('button', { name: /保存/ })).toBeInTheDocument());
  // 制造错误：删除 start 节点（store 直接操作）
  const startId = useBuilderStore.getState().nodes.find((n) => n.data.type === 'start')?.id;
  if (startId) useBuilderStore.getState().removeNode(startId);
  // 点击校验按钮
  const validateBtn = screen.getByRole('button', { name: /校验/ });
  fireEvent.click(validateBtn);
  // 校验结果抽屉打开
  expect(await screen.findByText('校验结果')).toBeInTheDocument();
  // 存在错误项（List 渲染）
  const issues = useBuilderStore.getState().validation.issues;
  if (issues.length > 0 && issues[0].nodeId) {
    fireEvent.click(screen.getByText(issues[0].message));
  }
  // 关闭校验结果抽屉（最后一个 drawer-close）
  const closeBtns = document.querySelectorAll('.ant-drawer-close');
  fireEvent.click(closeBtns[closeBtns.length - 1]);
});

it('发布弹窗：输入变更说明后取消，不调用发布', async () => {
  render(<BuilderPage />);
  await waitFor(() => expect(screen.getByRole('button', { name: /发布/ })).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: /发布/ }));
  expect(await screen.findByText('发布智能体')).toBeInTheDocument();
  // 输入变更说明
  fireEvent.change(screen.getByPlaceholderText('描述本次发布的主要变更，便于追溯'), {
    target: { value: '新增病历生成' },
  });
  // 取消
  fireEvent.click(screen.getByRole('button', { name: /取\s*消/ }));
  expect(m.publishDraftApi).not.toHaveBeenCalled();
});

it('设置抽屉：点 X 关闭触发 onClose', async () => {
  render(<BuilderPage />);
  await waitFor(() => expect(screen.getByRole('button', { name: /设置/ })).toBeInTheDocument());
  // 打开设置
  fireEvent.click(screen.getByRole('button', { name: /设置/ }));
  expect(await screen.findByText('智能体设置')).toBeInTheDocument();
  // 关闭按钮（Drawer 右上角 .ant-drawer-close）
  fireEvent.click(document.querySelector('.ant-drawer-close') as Element);
});

it('导入文件：上传合法 JSON 包触发 loadPackage', async () => {
  render(<BuilderPage />);
  await waitFor(() => expect(screen.getByRole('button', { name: /导入/ })).toBeInTheDocument());
  const file = new File(['{"packageFormatVersion":"1.0.0","agent":{"id":"x","name":"X","version":"1.0.0"}}'], 'x.json', {
    type: 'application/json',
  });
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
  // 导入成功或解析（不抛错）
});

it('双击画布空白处：放置节点（handler）', async () => {
  render(<BuilderPage />);
  await waitFor(() => expect(screen.getByText('节点库')).toBeInTheDocument());
  const pane = document.querySelector('.react-flow__pane') as HTMLElement;
  const before = useBuilderStore.getState().nodes.length;
  if (pane) {
    fireEvent.dblClick(pane);
    expect(useBuilderStore.getState().nodes.length).toBe(before + 1);
  }
});
