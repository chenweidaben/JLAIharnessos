/**
 * 健澜科技杠OS - 智能体元信息配置抽屉
 * Copyright (c) 2026 健澜科技.
 */

import { Drawer, Form, Input, Select, InputNumber, Tag, Divider, Typography } from 'antd';
import {
  AGENT_CATEGORIES,
  KNOWLEDGE_BASES,
  MEDICAL_TOOLS,
  MODEL_OPTIONS,
  RISK_META,
  ROLE_OPTIONS,
} from '../constants';
import { useBuilderStore } from '../builderStore';

const ALL_TOOL_OPTIONS = Object.entries(MEDICAL_TOOLS).map(([cat, tools]) => ({
  label: cat,
  options: tools.map((t) => ({ value: t, label: t })),
}));

export default function AgentMetaDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const meta = useBuilderStore((s) => s.meta);
  const updateMeta = useBuilderStore((s) => s.updateMeta);

  return (
    <Drawer title="智能体设置" open={open} onClose={onClose} width={460} destroyOnClose={false}>
      <Form layout="vertical">
        <Form.Item label="智能体 ID（英文中划线，唯一）" required>
          <Input
            value={meta.id}
            placeholder="如 medical-record-writer"
            onChange={(e) => updateMeta({ id: e.target.value })}
          />
        </Form.Item>
        <Form.Item label="中文名称" required>
          <Input value={meta.name} onChange={(e) => updateMeta({ name: e.target.value })} />
        </Form.Item>
        <Form.Item label="英文名称（可选）">
          <Input value={meta.nameEn} onChange={(e) => updateMeta({ nameEn: e.target.value })} />
        </Form.Item>
        <div style={{ display: 'flex', gap: 12 }}>
          <Form.Item label="版本" style={{ flex: 1 }}>
            <Input value={meta.version} onChange={(e) => updateMeta({ version: e.target.value })} />
          </Form.Item>
          <Form.Item label="分类" style={{ flex: 1 }}>
            <Select
              style={{ width: '100%' }}
              value={meta.category}
              options={AGENT_CATEGORIES.map((c) => ({ value: c, label: c }))}
              onChange={(v) => updateMeta({ category: v })}
            />
          </Form.Item>
        </div>
        <Form.Item label="风险等级">
          <Select
            style={{ width: '100%' }}
            value={meta.riskLevel}
            onChange={(v) => updateMeta({ riskLevel: v })}
            options={(Object.keys(RISK_META) as Array<keyof typeof RISK_META>).map((k) => ({
              value: k,
              label: `${RISK_META[k].label}`,
            }))}
          />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            高风险智能体（如处方审核）将强制人工确认与双复核。
          </Typography.Text>
        </Form.Item>
        <Form.Item label="一句话描述">
          <Input.TextArea rows={2} value={meta.description} onChange={(e) => updateMeta({ description: e.target.value })} />
        </Form.Item>

        <Divider orientation="left" plain>授权与资源</Divider>
        <Form.Item label="适用角色">
          <Select mode="multiple" style={{ width: '100%' }} value={meta.allowedRoles} options={ROLE_OPTIONS} onChange={(v) => updateMeta({ allowedRoles: v })} />
        </Form.Item>
        <Form.Item label="授权医疗工具">
          <Select
            mode="multiple"
            showSearch
            optionFilterProp="label"
            style={{ width: '100%' }}
            value={meta.tools}
            options={ALL_TOOL_OPTIONS}
            onChange={(v) => updateMeta({ tools: v })}
            placeholder="选择该智能体可调用的工具"
          />
        </Form.Item>
        <Form.Item label="绑定知识库">
          <Select mode="multiple" style={{ width: '100%' }} value={meta.knowledgeBases} options={KNOWLEDGE_BASES.map((k) => ({ value: k.name, label: k.label }))} onChange={(v) => updateMeta({ knowledgeBases: v })} />
        </Form.Item>
        <div style={{ display: 'flex', gap: 12 }}>
          <Form.Item label="默认模型" style={{ flex: 2 }}>
            <Select style={{ width: '100%' }} value={meta.model} options={MODEL_OPTIONS} onChange={(v) => updateMeta({ model: v })} />
          </Form.Item>
          <Form.Item label={`温度 ${meta.temperature}`} style={{ flex: 1 }}>
            <InputNumber min={0} max={1} step={0.05} style={{ width: '100%' }} value={meta.temperature} onChange={(v) => updateMeta({ temperature: v ?? 0.2 })} />
          </Form.Item>
        </div>

        <Divider orientation="left" plain>系统提示词与免责声明</Divider>
        <Form.Item label="系统提示词（将写入 prompts/system.md）">
          <Input.TextArea rows={5} value={meta.systemPrompt} onChange={(e) => updateMeta({ systemPrompt: e.target.value })} placeholder="定义智能体角色、边界与输出规范" />
        </Form.Item>
        <Form.Item label="医疗免责声明（必填）">
          <Input.TextArea rows={3} value={meta.disclaimer} onChange={(e) => updateMeta({ disclaimer: e.target.value })} />
        </Form.Item>
        <Tag color={meta.builtin ? 'blue' : 'default'}>{meta.builtin ? '内置智能体' : '自定义智能体'}</Tag>
      </Form>
    </Drawer>
  );
}
