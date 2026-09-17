/**
 * 健澜科技杠OS - 节点属性配置面板
 * Copyright (c) 2026 健澜科技.
 */

import { Button, Divider, Empty, Input, InputNumber, Select, Switch, Tag, Typography } from 'antd';
import { CopyOutlined, DeleteOutlined } from '@ant-design/icons';
import {
  KNOWLEDGE_BASES,
  MEDICAL_TOOLS,
  MODEL_OPTIONS,
  NODE_TYPE_MAP,
  ROLE_OPTIONS,
} from '../constants';
import { MARKET_AGENTS } from '@/mock/agentMarket';
import { useBuilderStore } from '../builderStore';
import type { NodeConfig } from '@/types/builder';

const { TextArea } = Input;

const labelStyle: React.CSSProperties = { fontSize: 12, color: '#5b6b7c', display: 'block', marginBottom: 4 };

/** 键值映射编辑器（inputMapping / assignments / outputMapping） */
function KeyValueEditor({
  value,
  onChange,
  keyPlaceholder = '字段名',
  valuePlaceholder = '表达式，如 input.patientId',
}: {
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}) {
  const entries = Object.entries(value ?? {});
  const update = (oldKey: string, key: string, val: string) => {
    const next: Record<string, string> = {};
    for (const [k, v] of entries) next[k === oldKey ? key || oldKey : k] = v;
    if (oldKey === key) next[oldKey] = val;
    onChange(next);
  };
  const remove = (key: string) => {
    const next = { ...value };
    delete next[key];
    onChange(next);
  };
  const add = () => onChange({ ...value, [`field_${entries.length + 1}`]: '' });
  return (
    <div>
      {entries.map(([k, v]) => (
        <div key={k} style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
          <Input size="small" placeholder={keyPlaceholder} value={k} onChange={(e) => update(k, e.target.value, v)} style={{ width: '42%' }} />
          <Input size="small" placeholder={valuePlaceholder} value={v} onChange={(e) => update(k, k, e.target.value)} style={{ flex: 1 }} />
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => remove(k)} />
        </div>
      ))}
      <Button size="small" type="dashed" block onClick={add}>
        + 添加映射
      </Button>
    </div>
  );
}

export default function PropertyPanel() {
  const nodes = useBuilderStore((s) => s.nodes);
  const selectedId = useBuilderStore((s) => s.selectedNodeId);
  const updateConfig = useBuilderStore((s) => s.updateNodeConfig);
  const updateName = useBuilderStore((s) => s.updateNodeName);
  const removeNode = useBuilderStore((s) => s.removeNode);
  const duplicateNode = useBuilderStore((s) => s.duplicateNode);

  const node = nodes.find((n) => n.id === selectedId);
  if (!node) {
    return (
      <div style={{ padding: 16 }}>
        <Empty description="选择一个节点进行配置" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
          点击画布中的节点，在此编辑其参数；从左侧拖入新节点。
        </Typography.Paragraph>
      </div>
    );
  }

  const cfg = node.data.config;
  const set = (patch: Partial<NodeConfig>) => updateConfig(node.id, patch);
  const meta = NODE_TYPE_MAP[node.data.nodeType];
  const otherNodes = nodes.filter((n) => n.id !== node.id).map((n) => ({ value: n.id, label: `${n.data.name}（${n.id}）` }));

  return (
    <div style={{ padding: 16, overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Tag color={meta.color} style={{ border: 'none' }}>{meta.label}</Tag>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>{node.id}</Typography.Text>
      </div>
      <Input value={node.data.name} onChange={(e) => updateName(node.id, e.target.value)} style={{ marginBottom: 12, fontWeight: 600 }} />

      {node.data.nodeType === 'llm' && (
        <>
          <label style={labelStyle}>模型</label>
          <Select style={{ width: '100%', marginBottom: 10 }} value={cfg.model} options={MODEL_OPTIONS} onChange={(v) => set({ model: v })} />
          <label style={labelStyle}>温度 {cfg.temperature ?? 0.2}</label>
          <input type="range" min={0} max={1} step={0.05} value={cfg.temperature ?? 0.2} onChange={(e) => set({ temperature: Number(e.target.value) })} style={{ width: '100%', marginBottom: 10 }} />
          <label style={labelStyle}>最大 Token</label>
          <InputNumber style={{ width: '100%', marginBottom: 10 }} value={cfg.maxTokens} onChange={(v) => set({ maxTokens: v ?? undefined })} />
          <label style={labelStyle}>系统提示词</label>
          <TextArea rows={3} style={{ marginBottom: 10 }} value={cfg.systemPrompt} onChange={(e) => set({ systemPrompt: e.target.value })} placeholder="角色与规则" />
          <label style={labelStyle}>用户消息模板（支持 ${'{...}'}）</label>
          <TextArea rows={3} style={{ marginBottom: 10 }} value={cfg.userTemplate} onChange={(e) => set({ userTemplate: e.target.value })} placeholder="如：为 ${'{input.chiefComplaint}'} 生成病历" />
          <Switch checked={!!cfg.jsonMode} onChange={(v) => set({ jsonMode: v })} /> <span>结构化 JSON 输出</span>
        </>
      )}

      {node.data.nodeType === 'tool' && (
        <>
          <label style={labelStyle}>医疗工具</label>
          <Select
            showSearch
            style={{ width: '100%', marginBottom: 10 }}
            value={cfg.toolName}
            placeholder="选择工具"
            optionFilterProp="label"
            options={Object.entries(MEDICAL_TOOLS).map(([cat, tools]) => ({
              label: cat,
              options: tools.map((t) => ({ value: t, label: t })),
            }))}
            onChange={(v) => set({ toolName: v })}
          />
          <label style={labelStyle}>入参映射</label>
          <KeyValueEditor value={cfg.inputMapping ?? {}} onChange={(v) => set({ inputMapping: v })} />
          <Divider style={{ margin: '10px 0' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label><Switch size="small" checked={!!cfg.readOnly} onChange={(v) => set({ readOnly: v })} /> 只读（可安全并发/重试）</label>
            <label><Switch size="small" checked={!!cfg.requireConfirmation} onChange={(v) => set({ requireConfirmation: v })} /> 执行前人工确认</label>
            <label><Switch size="small" checked={!!cfg.requireDoubleConfirm} onChange={(v) => set({ requireDoubleConfirm: v })} /> 双人复核（高风险）</label>
          </div>
        </>
      )}

      {node.data.nodeType === 'rag' && (
        <>
          <label style={labelStyle}>知识库（多选）</label>
          <Select mode="multiple" style={{ width: '100%', marginBottom: 10 }} value={cfg.knowledgeBases} options={KNOWLEDGE_BASES.map((k) => ({ value: k.name, label: k.label }))} onChange={(v) => set({ knowledgeBases: v })} />
          <label style={labelStyle}>查询表达式</label>
          <Input style={{ marginBottom: 10 }} value={cfg.query} onChange={(e) => set({ query: e.target.value })} placeholder="如 input.chiefComplaint" />
          <label style={labelStyle}>召回条数 topK</label>
          <InputNumber min={1} max={50} style={{ width: '100%', marginBottom: 10 }} value={cfg.topK} onChange={(v) => set({ topK: v ?? 5 })} />
          <label style={labelStyle}>相似度阈值 {cfg.scoreThreshold ?? 0.35}</label>
          <input type="range" min={0} max={0.9} step={0.05} value={cfg.scoreThreshold ?? 0.35} onChange={(e) => set({ scoreThreshold: Number(e.target.value) })} style={{ width: '100%', marginBottom: 10 }} />
          <label style={labelStyle}>检索策略</label>
          <Select style={{ width: '100%', marginBottom: 10 }} value={cfg.strategy} onChange={(v) => set({ strategy: v })} options={[{ value: 'hybrid', label: '混合（推荐）' }, { value: 'vector', label: '向量' }, { value: 'keyword', label: '关键词' }]} />
          <label style={labelStyle}>结果变量名</label>
          <Input value={cfg.outputVariable} onChange={(e) => set({ outputVariable: e.target.value })} />
        </>
      )}

      {node.data.nodeType === 'condition' && (
        <>
          <label style={labelStyle}>模式</label>
          <Select style={{ width: '100%', marginBottom: 10 }} value={cfg.mode} onChange={(v) => set({ mode: v })} options={[{ value: 'if-else', label: 'if-else' }, { value: 'switch', label: 'switch' }]} />
          {cfg.mode === 'switch' && (
            <>
              <label style={labelStyle}>switch 求值表达式</label>
              <Input style={{ marginBottom: 10 }} value={cfg.switchOn} onChange={(e) => set({ switchOn: e.target.value })} />
            </>
          )}
          <label style={labelStyle}>分支（右侧端口名）</label>
          {(cfg.branches ?? []).map((b, i) => (
            <div key={i} style={{ marginBottom: 6 }}>
              <Input size="small" style={{ marginBottom: 4 }} addonBefore="端口" value={b.name} onChange={(e) => { const arr = [...(cfg.branches ?? [])]; arr[i] = { ...b, name: e.target.value }; set({ branches: arr }); }} />
              {cfg.mode === 'if-else' && (
                <Input size="small" addonBefore="条件" value={b.when} onChange={(e) => { const arr = [...(cfg.branches ?? [])]; arr[i] = { ...b, when: e.target.value }; set({ branches: arr }); }} />
              )}
            </div>
          ))}
          <Button size="small" type="dashed" block style={{ marginBottom: 10 }} onClick={() => set({ branches: [...(cfg.branches ?? []), { name: `branch_${(cfg.branches?.length ?? 0) + 1}`, when: '' }] })}>+ 分支</Button>
          <label style={labelStyle}>默认出口端口（else/default）</label>
          <Input value={cfg.defaultPort} onChange={(e) => set({ defaultPort: e.target.value })} />
        </>
      )}

      {node.data.nodeType === 'loop' && (
        <>
          <label style={labelStyle}>循环模式</label>
          <Select style={{ width: '100%', marginBottom: 10 }} value={cfg.loopMode} onChange={(v) => set({ loopMode: v })} options={[{ value: 'foreach', label: 'foreach 遍历' }, { value: 'while', label: 'while 条件循环' }]} />
          {cfg.loopMode === 'foreach' ? (
            <>
              <label style={labelStyle}>集合表达式</label>
              <Input style={{ marginBottom: 10 }} value={cfg.collection} onChange={(e) => set({ collection: e.target.value })} placeholder="如 input.recordIds" />
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}><label style={labelStyle}>元素变量</label><Input size="small" value={cfg.itemVariable} onChange={(e) => set({ itemVariable: e.target.value })} /></div>
                <div style={{ flex: 1 }}><label style={labelStyle}>索引变量</label><Input size="small" value={cfg.indexVariable} onChange={(e) => set({ indexVariable: e.target.value })} /></div>
              </div>
            </>
          ) : (
            <>
              <label style={labelStyle}>继续条件</label>
              <Input style={{ marginBottom: 10 }} value={cfg.whileCondition} onChange={(e) => set({ whileCondition: e.target.value })} />
            </>
          )}
          <label style={labelStyle}>循环体入口节点（bodyEntry）</label>
          <Select style={{ width: '100%', marginBottom: 10 }} value={cfg.bodyEntry} options={otherNodes} onChange={(v) => set({ bodyEntry: v })} placeholder="选择循环体首节点" />
          <label style={labelStyle}>最大迭代次数</label>
          <InputNumber min={1} max={10000} style={{ width: '100%' }} value={cfg.maxIterations} onChange={(v) => set({ maxIterations: v ?? 1000 })} />
        </>
      )}

      {node.data.nodeType === 'parallel' && (
        <>
          <label style={labelStyle}>汇聚策略</label>
          <Select style={{ width: '100%', marginBottom: 10 }} value={cfg.parallelMode} onChange={(v) => set({ parallelMode: v })} options={[{ value: 'all', label: 'all 全部完成' }, { value: 'any', label: 'any 任一完成' }, { value: 'race', label: 'race 最快完成' }]} />
          <label style={labelStyle}>最大并发</label>
          <InputNumber min={1} max={20} style={{ width: '100%', marginBottom: 10 }} value={cfg.concurrency} onChange={(v) => set({ concurrency: v ?? 4 })} />
          <label style={labelStyle}>并行分支（入口节点）</label>
          {(cfg.parallelBranches ?? []).map((b, i) => (
            <div key={i} style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
              <Input size="small" style={{ width: '38%' }} addonBefore="名" value={b.name} onChange={(e) => { const arr = [...(cfg.parallelBranches ?? [])]; arr[i] = { ...b, name: e.target.value }; set({ parallelBranches: arr }); }} />
              <Select size="small" style={{ flex: 1 }} value={b.entryNode || undefined} options={otherNodes} placeholder="入口节点" onChange={(v) => { const arr = [...(cfg.parallelBranches ?? [])]; arr[i] = { ...b, entryNode: v }; set({ parallelBranches: arr }); }} />
            </div>
          ))}
          <Button size="small" type="dashed" block onClick={() => set({ parallelBranches: [...(cfg.parallelBranches ?? []), { name: `branch_${(cfg.parallelBranches?.length ?? 0) + 1}`, entryNode: '' }] })}>+ 分支</Button>
        </>
      )}

      {node.data.nodeType === 'human' && (
        <>
          <label style={labelStyle}>任务标题</label>
          <Input style={{ marginBottom: 10 }} value={cfg.title} onChange={(e) => set({ title: e.target.value })} />
          <label style={labelStyle}>处理说明</label>
          <TextArea rows={3} style={{ marginBottom: 10 }} value={cfg.instructions} onChange={(e) => set({ instructions: e.target.value })} />
          <label style={labelStyle}>处理角色</label>
          <Select mode="multiple" style={{ width: '100%', marginBottom: 10 }} value={cfg.assigneeRoles} options={ROLE_OPTIONS} onChange={(v) => set({ assigneeRoles: v })} />
          <label style={labelStyle}>超时（毫秒，可选）</label>
          <InputNumber style={{ width: '100%' }} value={cfg.timeoutMs} onChange={(v) => set({ timeoutMs: v ?? undefined })} />
        </>
      )}

      {node.data.nodeType === 'subagent' && (
        <>
          <label style={labelStyle}>目标智能体</label>
          <Select showSearch style={{ width: '100%', marginBottom: 10 }} value={cfg.agentId} options={MARKET_AGENTS.map((a) => ({ value: a.id, label: a.name }))} onChange={(v) => set({ agentId: v })} placeholder="选择子智能体" />
          <label style={labelStyle}>协作模式</label>
          <Select style={{ width: '100%', marginBottom: 10 }} value={cfg.collaborationMode} onChange={(v) => set({ collaborationMode: v })} options={[{ value: 'delegate', label: '委派（一次性返回）' }, { value: 'consultation', label: '会诊（多专家并行汇总）' }]} />
          {cfg.collaborationMode === 'consultation' && (
            <>
              <label style={labelStyle}>会诊专家</label>
              <Select mode="multiple" style={{ width: '100%', marginBottom: 10 }} value={cfg.consultationAgents} options={MARKET_AGENTS.map((a) => ({ value: a.id, label: a.name }))} onChange={(v) => set({ consultationAgents: v })} />
            </>
          )}
          <label style={labelStyle}>输入映射</label>
          <KeyValueEditor value={cfg.inputMapping ?? {}} onChange={(v) => set({ inputMapping: v })} />
        </>
      )}

      {node.data.nodeType === 'code' && (
        <>
          <label style={labelStyle}>输出字段 → 安全表达式</label>
          <KeyValueEditor value={cfg.assignments ?? {}} onChange={(v) => set({ assignments: v })} valuePlaceholder="安全表达式（无 eval）" />
        </>
      )}

      {node.data.nodeType === 'delay' && (
        <>
          <label style={labelStyle}>延时时长（毫秒）</label>
          <InputNumber min={1} style={{ width: '100%' }} value={cfg.durationMs} onChange={(v) => set({ durationMs: v ?? 1000 })} />
        </>
      )}

      {node.data.nodeType === 'end' && (
        <>
          <label style={labelStyle}>最终输出映射</label>
          <KeyValueEditor value={cfg.outputMapping ?? {}} onChange={(v) => set({ outputMapping: v })} valuePlaceholder="表达式" />
        </>
      )}

      {node.data.nodeType === 'start' && (
        <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
          开始节点是工作流唯一入口，接收外部输入（input.xxx）。
        </Typography.Paragraph>
      )}

      <Divider />
      <div style={{ display: 'flex', gap: 8 }}>
        <Button icon={<CopyOutlined />} onClick={() => duplicateNode(node.id)}>复制</Button>
        <Button danger icon={<DeleteOutlined />} disabled={node.data.nodeType === 'start'} onClick={() => removeNode(node.id)}>删除</Button>
      </div>
    </div>
  );
}
