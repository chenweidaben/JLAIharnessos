/**
 * 健澜科技 jlmedaios - 病案首页页面（M3-A，真实 BFF）
 *
 * 出院汇聚 → 编码员编码 → 第二人质控 → 归档状态机。
 * 健康门禁：BFF/DB 不可用时显式 Alert + Watermark，阻断写操作。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { useEffect, useState } from 'react';
import { Alert, Layout, Spin, Tag, Typography, Watermark } from 'antd';
import { FolderOpenOutlined } from '@ant-design/icons';
import { useFrontPageStore } from '@/store/frontPageStore';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import FrontPageQueue from '@/components/frontPage/FrontPageQueue';
import FrontPageDetail from '@/components/frontPage/FrontPageDetail';

const { Header, Content } = Layout;

const watermarkText = ['健澜科技', '病案首页', 'jlmedaios'];

export default function FrontPagePage() {
  const { dbUp, healthChecking, checkHealth, loadQueue } = useFrontPageStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      const up = await checkHealth();
      if (up) await loadQueue();
      setReady(true);
    })();
  }, [checkHealth, loadQueue]);

  const onRefresh = async () => {
    const up = await checkHealth();
    if (up) await loadQueue();
  };

  return (
    <Watermark content={watermarkText}>
      <Layout className="min-h-screen bg-ink-bg">
        <Header className="flex items-center justify-between bg-jl-primary px-6 shadow-card">
          <div className="flex items-center gap-3">
            <FolderOpenOutlined className="text-2xl text-white" />
            <Typography.Title level={4} className="!mb-0 !text-white">
              病案首页 · 编码-质控-归档
            </Typography.Title>
            <span className="hidden text-sm text-white/70 md:block">
              出院自动汇聚 · 编码员本人签名 · 第二人质控（职责分离）· 哈希链留痕
            </span>
          </div>
          <Tag color={dbUp ? 'green' : 'red'} data-testid="fp-health-tag">
            {dbUp ? 'BFF/DB 正常 (up)' : 'BFF/DB 不可用'}
          </Tag>
        </Header>
        <Content className="p-4">
          <DemoModeBanner />
          <Spin spinning={!ready || healthChecking}>
            {!dbUp ? (
              <Alert
                data-testid="fp-offline-alert"
                type="error"
                showIcon
                banner
                message="无法连接 BFF 或数据库，病案首页工作站不可用"
                description="请检查数据库服务；恢复后点击刷新重新探活。系统不会以缓存或假数据冒充首页结果。"
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
              <div data-testid="fp-content">
                <FrontPageQueue />
                <FrontPageDetail />
              </div>
            )}
          </Spin>
        </Content>
      </Layout>
    </Watermark>
  );
}
