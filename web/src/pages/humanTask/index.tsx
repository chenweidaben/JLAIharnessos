/**
 * 健澜科技 jlmedaios - 人工工单中心页面（M4-D，真实 BFF）
 *
 * 高风险节点强制人工：工作流执行到 human 节点时创建审核工单、实例等待人工；
 * 审核人在此认领并批准/驳回，工作流继续或终止。
 * 健康门禁：BFF/DB 不可用时显式 Alert + Watermark，阻断处理。
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
import { SolutionOutlined, ReloadOutlined } from '@ant-design/icons';
import { useHumanTaskStore } from '@/store/humanTaskStore';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import TaskList from './TaskList';
import TaskDetail from './TaskDetail';

const { Header, Content } = Layout;

const watermarkText = ['健澜科技', '人工工单中心', 'jlmedaios'];

export default function HumanTaskPage() {
  const {
    dbUp,
    healthChecking,
    checkHealth,
    loading,
    loadTasks,
  } = useHumanTaskStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      const up = await checkHealth();
      if (up) await loadTasks();
      setReady(true);
    })();
  }, [checkHealth, loadTasks]);

  const onRefresh = async () => {
    const up = await checkHealth();
    if (up) await loadTasks();
  };

  return (
    <Watermark content={watermarkText}>
      <Layout className="min-h-screen bg-ink-bg">
        <Header className="flex items-center justify-between bg-jl-primary px-6 shadow-card">
          <div className="flex items-center gap-3">
            <SolutionOutlined className="text-2xl text-white" />
            <Typography.Title level={4} className="!mb-0 !text-white">
              人工工单中心 · Human-in-the-loop
            </Typography.Title>
            <span className="hidden text-sm text-white/70 md:block">
              高风险节点强制人工 · 认领 · 批准/驳回签名
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button size="small" ghost icon={<ReloadOutlined />} data-testid="ht-top-refresh" onClick={() => void onRefresh()}>
              刷新
            </Button>
            <Tag color={dbUp ? 'green' : 'red'} data-testid="ht-health-tag">
              {dbUp ? 'BFF/DB 正常 (up)' : 'BFF/DB 不可用'}
            </Tag>
          </div>
        </Header>
        <Content className="p-4">
          <DemoModeBanner />
          <Spin spinning={!ready || healthChecking}>
            {!dbUp ? (
              <Alert
                data-testid="ht-offline-alert"
                type="error"
                showIcon
                banner
                message="无法连接 BFF 或数据库，人工工单中心不可用"
                description="请检查数据库服务；恢复后点击刷新重新探活。系统不会以缓存或假数据冒充审核结果。"
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
              <div data-testid="ht-content">
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Spin spinning={loading}>
                      <TaskList />
                    </Spin>
                  </Col>
                  <Col xs={24} md={12}>
                    <TaskDetail />
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
