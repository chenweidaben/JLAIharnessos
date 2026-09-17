/**
 * 健澜科技杠OS - 智能体工厂（低代码平台市场页）
 *
 * 医院信息科从这里基于内置模板二次编排，或新建/导入自定义智能体。
 *
 * Copyright (c) 2026 健澜科技.
 */

import { useNavigate } from 'react-router-dom';
import { Button, Card, Col, Row, Tag, Typography, Space, Empty, Input } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  SafetyCertificateOutlined,
  RobotOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useMemo, useState } from 'react';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
import { MARKET_AGENTS } from '@/mock/agentMarket';
import { useBuilderStore } from './builderStore';

const RISK_COLOR: Record<string, string> = { low: 'green', medium: 'orange', high: 'red' };
const RISK_LABEL: Record<string, string> = { low: '低风险', medium: '中风险', high: '高风险' };

export default function MarketPage() {
  usePageTitle('智能体工厂');
  const navigate = useNavigate();
  const reset = useBuilderStore((s) => s.reset);
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState<string>('全部');

  const categories = useMemo(
    () => ['全部', ...Array.from(new Set(MARKET_AGENTS.map((a) => a.category)))],
    [],
  );
  const filtered = MARKET_AGENTS.filter(
    (a) =>
      (category === '全部' || a.category === category) &&
      (!keyword || a.name.includes(keyword) || a.summary.includes(keyword) || a.id.includes(keyword)),
  );

  const newBlank = () => {
    reset();
    navigate('/builder/edit/new');
  };

  return (
    <PageContainer
      title="智能体工厂"
      description="低代码编排平台：医院信息科无需写代码，拖拽即可搭建 AI 病历生成、病历质控、语音病历等刚需智能体"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={newBlank}>
          新建空白智能体
        </Button>
      }
    >
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="搜索智能体名称 / 功能"
            style={{ width: 280 }}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          {categories.map((c) => (
            <Tag
              key={c}
              style={{ cursor: 'pointer', padding: '4px 10px' }}
              color={category === c ? 'blue' : 'default'}
              onClick={() => setCategory(c)}
            >
              {c}
            </Tag>
          ))}
        </Space>
      </Card>

      <Row gutter={[16, 16]}>
        {filtered.map((a) => (
          <Col xs={24} sm={12} lg={8} xl={6} key={a.id}>
            <Card
              hoverable
              actions={[
                <Button
                  key="edit"
                  type="link"
                  icon={<EditOutlined />}
                  onClick={() => navigate(`/builder/edit/${a.id}`)}
                >
                  在画布中编辑
                </Button>,
              ]}
            >
              <Card.Meta
                avatar={
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 10,
                      background: '#0A4D8C',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 20,
                    }}
                  >
                    <RobotOutlined />
                  </div>
                }
                title={
                  <Space direction="vertical" size={2}>
                    <Typography.Text strong>{a.name}</Typography.Text>
                    <Space size={4} wrap>
                      <Tag color="blue" style={{ margin: 0 }}>{a.category}</Tag>
                      <Tag color={RISK_COLOR[a.riskLevel]} style={{ margin: 0 }}>{RISK_LABEL[a.riskLevel]}</Tag>
                      {a.humanInLoop && (
                        <Tag icon={<SafetyCertificateOutlined />} color="volcano" style={{ margin: 0 }}>
                          人工在环
                        </Tag>
                      )}
                    </Space>
                  </Space>
                }
                description={
                  <Typography.Paragraph type="secondary" style={{ fontSize: 12, minHeight: 40, margin: '8px 0 0' }}>
                    {a.summary}
                  </Typography.Paragraph>
                }
              />
            </Card>
          </Col>
        ))}
      </Row>

      {filtered.length === 0 && <Empty description="未找到匹配的智能体" style={{ marginTop: 48 }} />}

      <Card size="small" style={{ marginTop: 16 }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          所有内置智能体均为可编辑模板：打开后可拖拽调整节点、配置工具与知识库、编辑提示词，
          通过校验后导出 agent.yaml 发布。智能体输出均为临床辅助建议，高风险动作强制人工确认。
        </Typography.Text>
      </Card>
    </PageContainer>
  );
}
