/**
 * 健澜科技 jlmedaios - 节点属性配置面板测试（M4-B）
 * Copyright (c) 2026 杭州健澜科技有限公司.
 *
 * 覆盖：
 *  - 未选中节点的空态；
 *  - 各类节点（llm/tool/rag/condition/loop/parallel/human/subagent/code/delay/end/start）
 *    属性表单的输入、开关、滑块与按钮；
 *  - KeyValueEditor 键值映射的增删改；
 *  - 节点复制 / 删除（start 不可删）。
 *
 * antd Select 在 jsdom 中无法通过鼠标选择，其 onChange 由 store 直接设置覆盖；
 * antd InputNumber 的 input 为 class .ant-input-number-input（非 type=number）。
 */
import { it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@test-utils';

import PropertyPanel from '@/pages/builder/components/PropertyPanel';
import { useBuilderStore } from '@/pages/builder/builderStore';
import type { NodeType } from '@/types/builder';

/** 数字输入框（antd InputNumber） */
function numberInputs(): HTMLInputElement[] {
  return Array.from(document.querySelectorAll('.ant-input-number-input')) as HTMLInputElement[];
}
/** 滑块 */
function rangeInput(): HTMLInputElement {
  return document.querySelector('input[type="range"]') as HTMLInputElement;
}
/** 开关 */
function switches(): HTMLElement[] {
  return Array.from(document.querySelectorAll('.ant-switch')) as HTMLElement[];
}

/** 重置画布并添加指定类型节点，选中后返回其 id */
function setupNode(type: NodeType): string {
  const store = useBuilderStore.getState();
  store.reset();
  const id = store.addNode(type, { x: 100, y: 100 });
  useBuilderStore.getState().selectNode(id);
  return id;
}

/** 取当前选中节点的 config */
function currentCfg(id: string) {
  return useBuilderStore.getState().nodes.find((n) => n.id === id)?.data.config;
}

beforeEach(() => {
  useBuilderStore.getState().reset();
});

it('未选中节点：显示空态提示', () => {
  render(<PropertyPanel />);
  expect(screen.getByText('选择一个节点进行配置')).toBeInTheDocument();
});

it('start 节点：显示说明，删除按钮禁用', () => {
  setupNode('start');
  render(<PropertyPanel />);
  expect(screen.getByText(/开始节点是工作流唯一入口/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /删除/ })).toBeDisabled();
});

it('llm 节点：编辑名称、温度、Token、提示词与 JSON 开关', () => {
  const id = setupNode('llm');
  render(<PropertyPanel />);

  // 名称
  fireEvent.change(screen.getByDisplayValue('大模型'), { target: { value: '病历生成 LLM' } });
  // 系统提示词
  fireEvent.change(screen.getByPlaceholderText('角色与规则'), { target: { value: '你是病历助手' } });
  // 用户模板
  fireEvent.change(screen.getByPlaceholderText(/如：/), { target: { value: '主诉：${input.chiefComplaint}' } });
  // 温度滑块
  fireEvent.change(rangeInput(), { target: { value: '0.5' } });
  // 最大 Token（唯一的数字输入）
  fireEvent.change(numberInputs()[0], { target: { value: '4096' } });
  // JSON 开关（llm 只有一个 switch）
  fireEvent.click(switches()[0]);

  const cfg = currentCfg(id);
  expect(cfg?.systemPrompt).toBe('你是病历助手');
  expect(cfg?.temperature).toBe(0.5);
  expect(cfg?.jsonMode).toBe(true);
});

it('tool 节点：切换三个开关', () => {
  const id = setupNode('tool');
  render(<PropertyPanel />);

  const labels = ['只读（可安全并发/重试）', '执行前人工确认', '双人复核（高风险）'];
  for (const l of labels) fireEvent.click(screen.getByText(l));

  const cfg = currentCfg(id);
  expect(cfg?.readOnly).toBe(true);
  expect(cfg?.requireConfirmation).toBe(true);
  expect(cfg?.requireDoubleConfirm).toBe(true);
});

it('tool 节点：KeyValueEditor 编辑入参映射', () => {
  const id = setupNode('tool');
  render(<PropertyPanel />);
  fireEvent.click(screen.getByText('+ 添加映射'));
  fireEvent.change(screen.getByPlaceholderText('字段名'), { target: { value: 'patientId' } });
  fireEvent.change(screen.getByPlaceholderText('表达式，如 input.patientId'), {
    target: { value: 'input.patientId' },
  });
  const cfg = currentCfg(id);
  expect(cfg?.inputMapping?.patientId).toBe('input.patientId');
});

it('rag 节点：编辑查询、topK、阈值、结果变量', () => {
  const id = setupNode('rag');
  render(<PropertyPanel />);

  fireEvent.change(screen.getByPlaceholderText('如 input.chiefComplaint'), { target: { value: 'input.chiefComplaint' } });
  fireEvent.change(screen.getByDisplayValue('retrieval'), { target: { value: 'docs' } });
  fireEvent.change(numberInputs()[0], { target: { value: '10' } });
  fireEvent.change(rangeInput(), { target: { value: '0.5' } });

  const cfg = currentCfg(id);
  expect(cfg?.query).toBe('input.chiefComplaint');
  expect(cfg?.outputVariable).toBe('docs');
  expect(cfg?.scoreThreshold).toBe(0.5);
});

it('condition 节点：if-else 下编辑分支条件、新增分支、默认端口', () => {
  const id = setupNode('condition');
  render(<PropertyPanel />);

  // 分支名输入（addonBefore 端口，值为 true）
  expect(screen.getByDisplayValue('true')).toBeInTheDocument();
  // 条件输入：addon 文本为「条件」的输入组内的 textbox
  const groups = Array.from(document.querySelectorAll('.ant-input-group'));
  const condGroup = groups.find((g) => g.textContent?.includes('条件'));
  const condInput = within(condGroup as HTMLElement).getByRole('textbox');
  fireEvent.change(condInput, { target: { value: 'input.age > 60' } });

  fireEvent.click(screen.getByText('+ 分支'));
  fireEvent.change(screen.getByDisplayValue('false'), { target: { value: 'else' } });

  const cfg = currentCfg(id);
  expect(cfg?.branches?.[0]?.when).toBe('input.age > 60');
  expect(cfg?.branches).toHaveLength(2);
  expect(cfg?.defaultPort).toBe('else');
});

it('condition 节点：switch 模式下编辑求值表达式', () => {
  const id = setupNode('condition');
  useBuilderStore.getState().updateNodeConfig(id, { mode: 'switch', branches: [{ name: 'a', when: '' }] });
  render(<PropertyPanel />);

  // switch 求值表达式输入（带标签 switch 求值表达式）
  const inputs = Array.from(document.querySelectorAll('.ant-input')) as HTMLInputElement[];
  const target = inputs.find((el) => el.value === '' && !el.placeholder);
  fireEvent.change(target ?? inputs[0], { target: { value: 'input.dept' } });
  expect(currentCfg(id)?.switchOn).toBe('input.dept');
});

it('loop 节点：foreach 下编辑集合与变量', () => {
  const id = setupNode('loop');
  render(<PropertyPanel />);

  fireEvent.change(screen.getByPlaceholderText('如 input.recordIds'), { target: { value: 'input.ids' } });
  fireEvent.change(screen.getByDisplayValue('item'), { target: { value: 'rec' } });
  fireEvent.change(numberInputs()[0], { target: { value: '500' } });

  const cfg = currentCfg(id);
  expect(cfg?.collection).toBe('input.ids');
  expect(cfg?.itemVariable).toBe('rec');
  expect(cfg?.maxIterations).toBe(500);
});

it('loop 节点：while 模式下编辑继续条件', () => {
  const id = setupNode('loop');
  useBuilderStore.getState().updateNodeConfig(id, { loopMode: 'while' });
  render(<PropertyPanel />);

  const inputs = Array.from(document.querySelectorAll('.ant-input')) as HTMLInputElement[];
  const target = inputs.find((el) => el.value === '');
  fireEvent.change(target ?? inputs[0], { target: { value: 'input.count < 10' } });
  expect(currentCfg(id)?.whileCondition).toBe('input.count < 10');
});

it('parallel 节点：编辑并发数与分支名称、新增分支', () => {
  const id = setupNode('parallel');
  render(<PropertyPanel />);

  fireEvent.change(numberInputs()[0], { target: { value: '8' } });
  fireEvent.change(screen.getByDisplayValue('branch1'), { target: { value: '分支A' } });
  fireEvent.click(screen.getByText('+ 分支'));

  const cfg = currentCfg(id);
  expect(cfg?.concurrency).toBe(8);
  expect(cfg?.parallelBranches?.[0]?.name).toBe('分支A');
  expect(cfg?.parallelBranches).toHaveLength(2);
});

it('human 节点：编辑标题、说明、超时', () => {
  const id = setupNode('human');
  render(<PropertyPanel />);

  // 名称与 title 默认均为「人工审核」，DOM 顺序名称在前、title 在后
  const sameValue = screen.getAllByDisplayValue('人工审核');
  fireEvent.change(sameValue[1], { target: { value: '请确认诊断' } });
  // 说明 TextArea（无 placeholder 的 textarea）
  const textareas = screen.getAllByRole('textbox').filter((el) => el.tagName === 'TEXTAREA');
  fireEvent.change(textareas[0], { target: { value: '补充既往史' } });
  fireEvent.change(numberInputs()[0], { target: { value: '60000' } });

  const cfg = currentCfg(id);
  expect(cfg?.title).toBe('请确认诊断');
  expect(cfg?.instructions).toBe('补充既往史');
  expect(cfg?.timeoutMs).toBe(60000);
});

it('subagent 节点：consultation 模式下显示会诊专家', () => {
  const id = setupNode('subagent');
  useBuilderStore.getState().updateNodeConfig(id, { collaborationMode: 'consultation' });
  render(<PropertyPanel />);
  expect(screen.getByText('会诊专家')).toBeInTheDocument();
});

it('code 节点：assignments 键值编辑器添加映射', () => {
  const id = setupNode('code');
  render(<PropertyPanel />);
  fireEvent.click(screen.getByText('+ 添加映射'));
  expect(Object.keys(currentCfg(id)?.assignments ?? {})).toHaveLength(1);
});

it('delay 节点：编辑延时时长', () => {
  const id = setupNode('delay');
  render(<PropertyPanel />);
  fireEvent.change(numberInputs()[0], { target: { value: '3000' } });
  expect(currentCfg(id)?.durationMs).toBe(3000);
});

it('end 节点：outputMapping 编辑器添加映射', () => {
  const id = setupNode('end');
  render(<PropertyPanel />);
  fireEvent.click(screen.getByText('+ 添加映射'));
  expect(Object.keys(currentCfg(id)?.outputMapping ?? {})).toHaveLength(2);
});

it('KeyValueEditor：编辑键、值，删除一行', () => {
  const id = setupNode('code');
  render(<PropertyPanel />);

  fireEvent.click(screen.getByText('+ 添加映射'));
  fireEvent.change(screen.getByPlaceholderText('字段名'), { target: { value: 'diagnosis' } });
  fireEvent.change(screen.getByPlaceholderText('安全表达式（无 eval）'), {
    target: { value: 'input.primaryDx' },
  });
  expect(currentCfg(id)?.assignments?.diagnosis).toBe('input.primaryDx');

  // 删除该行（带删除图标的小按钮，danger 小号）
  const delBtn = document.querySelector('.ant-btn-dangerous.ant-btn-sm') as HTMLElement;
  fireEvent.click(delBtn);
  expect(currentCfg(id)?.assignments?.diagnosis).toBeUndefined();
});

it('复制节点：生成副本并选中', () => {
  setupNode('delay');
  render(<PropertyPanel />);
  fireEvent.click(screen.getByRole('button', { name: /复制/ }));
  const state = useBuilderStore.getState();
  // start + end + delay + delay副本 = 4
  expect(state.nodes).toHaveLength(4);
  expect(state.nodes.find((n) => n.id === state.selectedNodeId)?.data.name).toContain('副本');
});

it('删除节点：非 start 节点可删除', () => {
  const id = setupNode('delay');
  render(<PropertyPanel />);
  fireEvent.click(screen.getByRole('button', { name: /删除/ }));
  const nodes = useBuilderStore.getState().nodes;
  expect(nodes.find((n) => n.id === id)).toBeUndefined();
  expect(nodes).toHaveLength(2);
});
