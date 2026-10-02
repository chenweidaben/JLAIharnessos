/**
 * 健澜科技 jlmedaios - 科研专病队列页面（M5-B，真实 BFF）
 *
 * 队列定义 → 发布 → 运行匹配（确定性规则引擎自动入组）→ 统计/脱敏导出 → 归档。
 * 健康门禁：BFF/DB 不可用时显式 Alert + Watermark，阻断写操作。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { useEffect, useState } from 'react';
import { Alert, Layout, Spin, Tag, Typography, Watermark } from 'antd';
import { ExperimentOutlined } from '@ant-design/icons';
import { useResearchStore } from '@/store/researchStore';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import CohortList from '@/components/research/CohortList';
import CohortDetail from '@/components/research/CohortDetail';

const { Header, Content } = Layout;

const watermarkText = ['健澜科技', '科研专病队列', 'jlmedaios'];

export default function ResearchPage() {
  const { dbUp, healthChecking, checkHealth, loadCohorts } = useResearchStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      const up = await checkHealth();
      if (up) await loadCohorts();
      setReady(true);
    })();
  }, [checkHealth, loadCohorts]);

  const onRefresh = async () => {
    const up = await checkHealth();
    if (up) await loadCohorts();
  };

  return (
    <Watermark content={watermarkText}>
      <Layout className="min-h-screen bg-ink-bg">
        <Header className="flex items-center justify-between bg-jl-primary px-6 shadow-card">
          <div className="flex items-center gap-3">
            <ExperimentOutlined className="text-2xl text-white" />
            <Typography.Title level={4} className="!mb-0 !text-white">
              科研专病队列 · 队列定义-匹配-统计-导出
            </Typography.Title>
            <span className="hidden text-sm text-white/70 md:block">
              确定性规则自动入组 · 成员快照脱敏 · 不用于诊疗
            </span>
          </div>
          <Tag color={dbUp ? 'green' : 'red'} data-testid="research-health-tag">
            {dbUp ? 'BFF/DB 正常 (up)' : 'BFF/DB 不可用'}
          </Tag>
        </Header>
        <Content className="p-4">
          <DemoModeBanner />
          <Spin spinning={!ready || healthChecking}>
            {!dbUp ? (
              <Alert
                data-testid="research-offline-alert"
                type="error"
                showIcon
                banner
                message="无法连接 BFF 或数据库，科研队列工作站不可用"
                description="请检查数据库服务；恢复后点击刷新重新探活。系统不会以缓存或假数据冒充匹配结果。"
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
              <div data-testid="research-content">
                <CohortList />
                <CohortDetail />
              </div>
            )}
          </Spin>
        </Content>
      </Layout>
    </Watermark>
  );
}
