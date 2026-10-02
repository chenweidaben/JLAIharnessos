/**
 * 健澜科技 jlmedaios - 智能体运行台页面（M4-C，真实 BFF）
 *
 * 触发已发布智能体执行，持久化运行实例、节点记录与用量，并支持结果回放。
 * 健康门禁：BFF/DB 不可用时显式 Alert + Watermark，阻断执行。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Col,
  Layout,
  Row,
  Spin,
  Tag,
  Typography,
  Watermark,
} from 'antd';
import { RobotOutlined, ReloadOutlined } from '@ant-design/icons';
import { useAgentRuntimeStore } from '@/store/agentRuntimeStore';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import RunPanel from './RunPanel';
import InstanceList from './InstanceList';
import InstanceDetail from './InstanceDetail';

const { Header, Content } = Layout;

const watermarkText = ['健澜科技', '智能体运行台', 'jlmedaios'];

export default function AgentRuntimePage() {
  const {
    dbUp,
    healthChecking,
    checkHealth,
    loading,
    loadInstances,
  } = useAgentRuntimeStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      const up = await checkHealth();
      if (up) await loadInstances();
      setReady(true);
    })();
  }, [checkHealth, loadInstances]);

  const onRefresh = async () => {
    const up = await checkHealth();
    if (up) await loadInstances();
  };

  return (
    <Watermark content={watermarkText}>
      <Layout className="min-h-screen bg-ink-bg">
        <Header className="flex items-center justify-between bg-jl-primary px-6 shadow-card">
          <div className="flex items-center gap-3">
            <RobotOutlined className="text-2xl text-white" />
            <Typography.Title level={4} className="!mb-0 !text-white">
              智能体运行台 · Agent Runtime
            </Typography.Title>
            <span className="hidden text-sm text-white/70 md:block">
              执行已发布智能体 · 节点记录 · 用量留痕 · 结果回放
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button size="small" ghost icon={<ReloadOutlined />} data-testid="rt-top-refresh" onClick={() => void onRefresh()}>
              刷新
            </Button>
            <Tag color={dbUp ? 'green' : 'red'} data-testid="rt-health-tag">
              {dbUp ? 'BFF/DB 正常 (up)' : 'BFF/DB 不可用'}
            </Tag>
          </div>
        </Header>
        <Content className="p-4">
          <DemoModeBanner />
          <Spin spinning={!ready || healthChecking}>
            {!dbUp ? (
              <Alert
                data-testid="rt-offline-alert"
                type="error"
                showIcon
                banner
                message="无法连接 BFF 或数据库，智能体运行台不可用"
                description="请检查数据库服务；恢复后点击刷新重新探活。系统不会以缓存或假数据冒充执行结果。"
                action={
                  <button
                    type="button"
                    className="ant-btn ant-btn-default"
                    onClick={() => void onRefresh()}
                  >
                    刷 新
                  </button>
                }
              />
            ) : (
              <div data-testid="rt-content">
                <Row gutter={16}>
                  <Col xs={24} md={8}>
                    <RunPanel />
                  </Col>
                  <Col xs={24} md={16}>
                    <Spin spinning={loading}>
                      <InstanceList />
                      <div className="mt-3">
                        <InstanceDetail />
                      </div>
                    </Spin>
                  </Col>
                </Row>
              </div>
            )}
          </Spin>
        </Content>
      </Layout>
    </Watermark>
  );
}
