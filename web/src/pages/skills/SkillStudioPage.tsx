/**
 * 健澜科技数智医院智能体操作系统（jlmedaios）
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 技能工作室：可视化选择技能、编辑 SKILL.md、在线校验、试运行、启停。
 */
import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Divider,
  List,
  message,
  Result,
  Row,
  Space,
  Tag,
  Typography,
} from 'antd';
import {
  CheckCircleOutlined,
  PlayCircleOutlined,
  SaveOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';

import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
import { get, post, put } from '@/services';

interface SkillItem {
  id: string;
  name: string;
  version: string;
  category: string;
  summary: string;
  riskLevel: 'low' | 'medium' | 'high';
  enabled: boolean;
}

export default function SkillStudioPage() {
  usePageTitle('技能工作室');
  const [list, setList] = useState<SkillItem[]>([]);
  const [active, setActive] = useState<string>('');
  const [content, setContent] = useState('');
  const [valid, setValid] = useState<{ ok: boolean; msg: string } | null>(null);
  const [runResult, setRunResult] = useState<string>('');

  const load = () => {
    get<{ items: SkillItem[] }>('/skills')
      .then((d) => setList(d.items ?? []))
      .catch(() => undefined);
  };
  useEffect(load, []);

  const pick = (id: string) => {
    setActive(id);
    setRunResult('');
    setValid(null);
    get<{ body: string }>(`/skills/${id}`)
      .then((d) => setContent(d.body ? `---\n${toFrontmatter(d)}\n---\n\n${d.body}` : ''))
      .catch(() => setContent(''));
  };

  /** 把清单对象拼回 frontmatter（演示用：工作室以文本为主） */
  function toFrontmatter(d: Record<string, unknown>): string {
    const m = d as Record<string, unknown>;
    const lines = [
      `id: ${m.id ?? ''}`,
      `name: ${m.name ?? ''}`,
      `version: ${m.version ?? '1.0.0'}`,
      `category: ${m.category ?? ''}`,
      `summary: ${m.summary ?? ''}`,
      `riskLevel: ${m.riskLevel ?? 'low'}`,
    ];
    return lines.join('\n');
  }

  const validate = async () => {
    try {
      const r = await post<{ valid: boolean; error?: string; dependencyIssues?: unknown[] }>(
        '/skills/validate',
        { content },
      );
      if (r.valid) {
        setValid({
          ok: true,
          msg: `校验通过${r.dependencyIssues?.length ? `，依赖告警 ${r.dependencyIssues.length} 项` : ''}`,
        });
      } else {
        setValid({ ok: false, msg: r.error ?? '校验失败' });
      }
    } catch (e) {
      setValid({ ok: false, msg: e instanceof Error ? e.message : '校验请求失败' });
    }
  };

  const dryRun = async () => {
    if (!active) return;
    try {
      const r = await post<{ status: string; reason?: string }>(
        `/skills/dry-run/${active}`,
        { inputs: { patientId: 'demo-patient' } },
      );
      setRunResult(`试运行结果：${r.status}${r.reason ? `（${r.reason}）` : ''}`);
      message.success('试运行完成');
    } catch (e) {
      setRunResult('试运行失败：' + (e instanceof Error ? e.message : ''));
    }
  };

  const toggle = async (id: string, enabled: boolean) => {
    await put(`/skills/${id}/enabled`, { enabled });
    message.success(enabled ? '已启用' : '已停用');
    load();
  };

  return (
    <PageContainer
      title="技能工作室"
      description="jlmedaios · 编辑 SKILL.md / 在线校验 / 试运行 / 启停"
    >
      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Card size="small" title="技能列表">
            <List
              size="small"
              dataSource={list}
              renderItem={(s) => (
                <List.Item
                  style={{ cursor: 'pointer', background: s.id === active ? '#e6f0ff' : undefined }}
                  onClick={() => pick(s.id)}
                  actions={[
                    <Button
                      size="small"
                      type="link"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggle(s.id, !s.enabled);
                      }}
                    >
                      {s.enabled ? '停用' : '启用'}
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <Space>
                        {s.name}
                        <Tag color={s.riskLevel === 'high' ? 'red' : s.riskLevel === 'medium' ? 'orange' : 'green'}>
                          {s.riskLevel}
                        </Tag>
                      </Space>
                    }
                    description={s.summary}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        <Col xs={24} md={16}>
          <Card
            size="small"
            title={
              <Space>
                <ThunderboltOutlined style={{ color: '#0B3D91' }} />
                编辑 {active || '（选择左侧技能）'}
              </Space>
            }
            extra={
              <Space>
                <Button icon={<SaveOutlined />} onClick={validate}>
                  校验
                </Button>
                <Button type="primary" icon={<PlayCircleOutlined />} onClick={dryRun}>
                  试运行
                </Button>
              </Space>
            }
          >
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              spellCheck={false}
              style={{
                width: '100%',
                height: 360,
                fontFamily: 'monospace',
                fontSize: 12,
                padding: 12,
                border: '1px solid #d9d9d9',
                borderRadius: 6,
              }}
            />
            {valid && (
              <Result
                status={valid.ok ? 'success' : 'error'}
                title={valid.msg}
                style={{ padding: 0, marginTop: 8 }}
              />
            )}
            {runResult && (
              <>
                <Divider style={{ margin: '12px 0' }} />
                <Typography.Text>
                  <CheckCircleOutlined /> {runResult}
                </Typography.Text>
              </>
            )}
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}
