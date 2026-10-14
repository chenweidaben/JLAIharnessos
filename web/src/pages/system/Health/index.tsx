/* ============================================================================
 * 健澜科技数智医院智能体 - 系统健康监控仪表盘
 *
 * 四个状态卡：BFF 进程 / DB 连接池 / outbox 积压 / agent 熔断；下方指标明细列表。
 * 深海蓝 VI：bg-jl-primary 页头 + bg-ink-bg 内容区；30s 自动刷新。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 * ==========================================================================*/

import { useEffect, type ReactNode } from 'react';
import {
  Alert, Card, Col, Layout, List, Row, Space, Spin, Tag, Typography, Watermark, message,
} from 'antd';
import {
  ApiOutlined,
  DatabaseOutlined,
  InboxOutlined,
  ReloadOutlined,
  RobotOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import { useSystemHealthStore } from '@/store/systemHealthStore';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import type { Severity, SystemHealth } from '@/services/api/systemHealth';

const { Header, Content } = Layout;

const watermarkText = ['健澜科技', '系统健康', 'jlmedaios'];

/** 严重度 → 标签颜色（深海蓝体系下的状态语义色） */
const SEVERITY_COLOR: Record<Severity, string> = {
  healthy: 'green',
  warning: 'orange',
  critical: 'red',
  unknown: 'default',
};

const OVERALL_COLOR: Record<SystemHealth['overall'], string> = {
  healthy: 'green',
  warning: 'orange',
  critical: 'red',
};

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds} 秒`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} 分 ${seconds % 60} 秒`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h} 时 ${m} 分`;
}

interface StatCardProps {
  title: string;
  icon: ReactNode;
  status: Severity;
  headline: string;
  sub: string;
}

function StatCard({ title, icon, status, headline, sub }: StatCardProps) {
  return (
    <Card className="shadow-card" bordered={false}>
      <div className="flex items-start justify-between">
        <Space direction="vertical" size={2}>
          <Space size={8}>
            <span className="text-lg text-jl-primary">{icon}</span>
            <Typography.Text type="secondary">{title}</Typography.Text>
          </Space>
          <Typography.Title level={3} className="!mb-0">
            {headline}
          </Typography.Title>
          <Typography.Text type="secondary" className="text-xs">
            {sub}
          </Typography.Text>
        </Space>
        <Tag color={SEVERITY_COLOR[status]} className="!mr-0">
          {status === 'healthy' && '正常'}
          {status === 'warning' && '预警'}
          {status === 'critical' && '严重'}
          {status === 'unknown' && '未知/演示'}
        </Tag>
      </div>
    </Card>
  );
}

export default function SystemHealthPage() {
  const { health, loading, error, load } = useSystemHealthStore();

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 30_000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (error) message.error(error);
  }, [error]);

  return (
    <Watermark content={watermarkText}>
      <Layout className="min-h-screen bg-ink-bg">
        <Header className="flex items-center justify-between bg-jl-primary px-6 shadow-card">
          <div className="flex items-center gap-3">
            <DashboardOutlined className="text-2xl text-white" />
            <Typography.Title level={4} className="!mb-0 !text-white">
              系统健康监控 · BFF / 连接池 / 发件箱 / 智能体熔断
            </Typography.Title>
          </div>
          <Space>
            {health?.demo ? <Tag color="blue">演示模式</Tag> : null}
            <Tag color={health ? OVERALL_COLOR[health.overall] : 'default'}>
              {health
                ? `总体：${health.overall === 'healthy' ? '健康' : health.overall === 'warning' ? '预警' : '严重'}`
                : '总体：—'}
            </Tag>
          </Space>
        </Header>

        <Content className="p-4">
          <DemoModeBanner />
          <Spin spinning={loading && !health}>
            {!health && !loading ? (
              <Alert
                type="error"
                showIcon
                banner
                message="健康状态不可用"
                description={error ?? '请检查 BFF 服务后点击刷新；系统不会以缓存数据冒充正常状态。'}
                action={
                  <button
                    type="button"
                    className="ant-btn ant-btn-default"
                    onClick={() => void load()}
                  >
                    刷 新
                  </button>
                }
              />
            ) : health ? (
              <>
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={12} xl={6}>
                    <StatCard
                      title="BFF 进程"
                      icon={<ApiOutlined />}
                      status={health.bff.status}
                      headline={formatUptime(health.bff.uptimeSeconds)}
                      sub={`累计 HTTP 请求 ${health.bff.requestCount} 次`}
                    />
                  </Col>
                  <Col xs={24} md={12} xl={6}>
                    <StatCard
                      title="DB 连接池"
                      icon={<DatabaseOutlined />}
                      status={health.db.status}
                      headline={
                        health.db.usedCount !== null && health.db.max !== null
                          ? `${health.db.usedCount}/${health.db.max}`
                          : health.db.status === 'unknown'
                            ? '未连接'
                            : '已连通'
                      }
                      sub={health.db.message}
                    />
                  </Col>
                  <Col xs={24} md={12} xl={6}>
                    <StatCard
                      title="发件箱积压"
                      icon={<InboxOutlined />}
                      status={health.outbox.status}
                      headline={`${health.outbox.pending} 条`}
                      sub={`死信 ${health.outbox.dead} 条 · ${health.outbox.message}`}
                    />
                  </Col>
                  <Col xs={24} md={12} xl={6}>
                    <StatCard
                      title="智能体熔断"
                      icon={<RobotOutlined />}
                      status={health.agents.status}
                      headline={
                        health.agents.tripped.length > 0
                          ? `${health.agents.tripped.length} 个熔断`
                          : `${health.agents.total} 个正常`
                      }
                      sub={health.agents.message}
                    />
                  </Col>
                </Row>

                <Card
                  className="mt-4 shadow-card"
                  bordered={false}
                  title="指标明细"
                  extra={
                    <Space size={12}>
                      <Typography.Text type="secondary" className="text-xs">
                        采集时间：{new Date(health.checkedAt).toLocaleString('zh-CN')}
                      </Typography.Text>
                      <button
                        type="button"
                        className="ant-btn ant-btn-default ant-btn-sm"
                        onClick={() => void load()}
                      >
                        <ReloadOutlined /> 刷新
                      </button>
                    </Space>
                  }
                >
                  <List
                    size="small"
                    dataSource={health.checks}
                    renderItem={(item) => (
                      <List.Item>
                        <Space>
                          <Tag color={SEVERITY_COLOR[item.status]}>
                            {item.status === 'healthy'
                              ? '正常'
                              : item.status === 'warning'
                                ? '预警'
                                : item.status === 'critical'
                                  ? '严重'
                                  : '未知'}
                          </Tag>
                          <Typography.Text strong>{item.name}</Typography.Text>
                          <Typography.Text type="secondary">{item.message}</Typography.Text>
                        </Space>
                      </List.Item>
                    )}
                  />
                </Card>
              </>
            ) : null}
          </Spin>
        </Content>
      </Layout>
    </Watermark>
  );
}
