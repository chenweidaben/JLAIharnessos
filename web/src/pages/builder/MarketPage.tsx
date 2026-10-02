/**
 * 健澜科技杠OS - 智能体工厂（低代码平台市场页）
 *
 * 医院信息科从这里：
 *  - 「我的智能体」：打开已持久化的智能体（草稿 / 已发布版本）继续编排与发布；
 *  - 「内置模板」：基于 10 大刚需模板二次编排；
 *  - 新建空白智能体或导入自定义智能体。
 *
 * Copyright (c) 2026 健澜科技.
 */

import { useNavigate } from 'react-router-dom';
import { Button, Card, Col, Row, Tag, Typography, Space, Empty, Input, Tabs, Spin } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  SafetyCertificateOutlined,
  RobotOutlined,
  SearchOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
import { MARKET_AGENTS } from '@/mock/agentMarket';
import { listBuilderAgentsApi } from '@/services/api/agentBuilder';
import type { AgentBuilderSummary } from '@/types/agentBuilder';

const RISK_COLOR: Record<string, string> = { low: 'green', medium: 'orange', high: 'red' };
const RISK_LABEL: Record<string, string> = { low: '低风险', medium: '中风险', high: '高风险' };

export default function MarketPage() {
  usePageTitle('智能体工厂');
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState<string>('全部');
  const [mine, setMine] = useState<AgentBuilderSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('mine');

  const loadMine = useCallback(async () => {
    setLoading(true);
    try {
      setMine(await listBuilderAgentsApi());
    } catch (e) {
      // 列表加载失败（如断库）：不冒充数据，清空并提示
      setMine([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMine();
  }, [loadMine]);

  const categories = useMemo(
    () => ['全部', ...Array.from(new Set(MARKET_AGENTS.map((a) => a.category)))],
    [],
  );

  const filteredTemplates = MARKET_AGENTS.filter(
    (a) =>
      (category === '全部' || a.category === category) &&
      (!keyword || a.name.includes(keyword) || a.summary.includes(keyword) || a.id.includes(keyword)),
  );

  const filteredMine = mine.filter(
    (a) =>
      !keyword ||
      a.name.includes(keyword) ||
      a.agentId.includes(keyword) ||
      a.description.includes(keyword),
  );

  const newBlank = () => {
    navigate('/builder/edit/new');
  };

  /** 我的智能体卡片 */
  const mineCards = (
    <Row gutter={[16, 16]}>
      {filteredMine.map((a) => (
        <Col xs={24} sm={12} lg={8} xl={6} key={a.agentId}>
          <Card
            hoverable
            actions={[
              <Button
                key="edit"
                type="link"
                icon={<EditOutlined />}
                onClick={() => navigate(`/builder/edit/${a.agentId}`)}
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
                    <Tag color={RISK_COLOR[a.riskLevel]} style={{ margin: 0 }}>
                      {RISK_LABEL[a.riskLevel]}
                    </Tag>
                    {a.status === 'enabled' ? (
                      <Tag color="success" style={{ margin: 0 }}>
                        已发布{a.currentVersion ? ` v${a.currentVersion}` : ''}
                      </Tag>
                    ) : (
                      <Tag color="default" style={{ margin: 0 }}>
                        {a.status === 'disabled' ? '已停用' : '草稿'}
                      </Tag>
                    )}
                  </Space>
                </Space>
              }
              description={
                <Typography.Paragraph
                  type="secondary"
                  style={{ fontSize: 12, minHeight: 40, margin: '8px 0 0' }}
                  ellipsis={{ rows: 2 }}
                >
                  {a.description || a.agentId}
                </Typography.Paragraph>
              }
            />
          </Card>
        </Col>
      ))}
      {!loading && filteredMine.length === 0 && (
        <Col span={24}>
          <Empty
            description={keyword ? '未找到匹配的智能体' : '还没有自己的智能体，点击右上角新建或从内置模板开始'}
            style={{ marginTop: 48 }}
          />
        </Col>
      )}
    </Row>
  );

  /** 内置模板卡片 */
  const templateCards = (
    <>
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="搜索模板名称 / 功能"
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
        {filteredTemplates.map((a) => (
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
                  基于此模板搭建
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
                      <Tag color={RISK_COLOR[a.riskLevel]} style={{ margin: 0 }}>
                        {RISK_LABEL[a.riskLevel]}
                      </Tag>
                      <Tag icon={<SafetyCertificateOutlined />} color="volcano" style={{ margin: 0 }}>
                        人工在环
                      </Tag>
                    </Space>
                  </Space>
                }
                description={
                  <Typography.Paragraph
                    type="secondary"
                    style={{ fontSize: 12, minHeight: 40, margin: '8px 0 0' }}
                  >
                    {a.summary}
                  </Typography.Paragraph>
                }
              />
            </Card>
          </Col>
        ))}
      </Row>
    </>
  );

  return (
    <PageContainer
      title="智能体工厂"
      description="低代码编排平台：医院信息科无需写代码，拖拽即可搭建 AI 病历生成、病历质控、语音病历等刚需智能体，发布后纳入版本与审计"
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => void loadMine()}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={newBlank}>
            新建空白智能体
          </Button>
        </Space>
      }
    >
      <Spin spinning={loading}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            { key: 'mine', label: `我的智能体（${mine.length}）`, children: mineCards },
            { key: 'templates', label: '内置模板', children: templateCards },
          ]}
        />
      </Spin>

      <Card size="small" style={{ marginTop: 16 }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          编排 DSL 为纯声明式数据（不含可执行代码），表达式受白名单沙箱约束；发布前须通过结构与语义校验，
          高风险动作强制人工确认。智能体输出均为临床辅助建议，不能替代医生诊断，最终诊疗决策由经治医师负责。
        </Typography.Text>
      </Card>
    </PageContainer>
  );
}
