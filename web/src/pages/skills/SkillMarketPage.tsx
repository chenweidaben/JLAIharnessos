/**
 * 健澜科技数智医院智能体操作系统（jlmedaios）
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 技能市场 / 技能库浏览页：按分类、角色、风险等级浏览全部已发布技能。
 * 视觉：AntD5 + Tailwind，深海蓝 VI（#0B3D91）。
 */
import { useEffect, useMemo, useState } from 'react';
import { Badge, Card, Col, Input, Row, Select, Space, Tag, Typography } from 'antd';

import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
import { get } from '@/services';

interface SkillItem {
  id: string;
  name: string;
  version: string;
  category: string;
  summary: string;
  riskLevel: 'low' | 'medium' | 'high';
  roles: string[];
  requiredTools: string[];
  requiredAgents: string[];
  tags: string[];
  enabled: boolean;
}

const RISK_COLOR: Record<SkillItem['riskLevel'], string> = {
  low: 'green',
  medium: 'orange',
  high: 'red',
};

const RISK_TEXT: Record<SkillItem['riskLevel'], string> = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
};

export default function SkillMarketPage() {
  usePageTitle('技能市场');
  const [items, setItems] = useState<SkillItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [kw, setKw] = useState('');
  const [cat, setCat] = useState<string | undefined>();

  useEffect(() => {
    setLoading(true);
    get<{ total: number; items: SkillItem[] }>('/skills')
      .then((d) => setItems(d.items ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(
    () => [...new Set(items.map((i) => i.category))],
    [items],
  );

  const filtered = items.filter((i) => {
    if (cat && i.category !== cat) return false;
    if (kw && !`${i.name}${i.summary}${i.id}`.toLowerCase().includes(kw.toLowerCase()))
      return false;
    return true;
  });

  return (
    <PageContainer
      title="技能市场"
      description="jlmedaios 内置医疗技能库 · 声明式 SOP · 按角色与场景即取即用"
    >
      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          placeholder="搜索技能名 / 摘要"
          allowClear
          style={{ width: 280 }}
          onChange={(e) => setKw(e.target.value)}
        />
        <Select
          allowClear
          placeholder="按分类筛选"
          style={{ width: 160 }}
          onChange={setCat}
          options={categories.map((c) => ({ label: c, value: c }))}
        />
        <Tag color="blue">共 {filtered.length} 个技能</Tag>
      </Space>

      <Row gutter={[16, 16]}>
        {filtered.map((s) => (
          <Col xs={24} sm={12} lg={8} xl={6} key={s.id}>
            <Badge.Ribbon
              text={RISK_TEXT[s.riskLevel]}
              color={RISK_COLOR[s.riskLevel]}
            >
              <Card
                loading={loading}
                title={
                  <Space>
                    <span style={{ color: '#0B3D91', fontWeight: 600 }}>{s.name}</span>
                    <Tag>{s.version}</Tag>
                  </Space>
                }
                extra={
                  s.enabled ? (
                    <Tag color="success">已启用</Tag>
                  ) : (
                    <Tag color="default">已停用</Tag>
                  )
                }
              >
                <Typography.Paragraph type="secondary" ellipsis={{ rows: 2 }}>
                  {s.summary}
                </Typography.Paragraph>
                <Space wrap size={[4, 4]}>
                  <Tag color="geekblue">{s.category}</Tag>
                  {s.roles.map((r) => (
                    <Tag key={r}>角色 {r}</Tag>
                  ))}
                </Space>
                <div style={{ marginTop: 8 }}>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    工具 {s.requiredTools.length} · 智能体 {s.requiredAgents.length}
                  </Typography.Text>
                </div>
              </Card>
            </Badge.Ribbon>
          </Col>
        ))}
      </Row>
    </PageContainer>
  );
}
