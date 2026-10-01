/**
 * 健澜科技 jlmedaios - 双向转诊页面（M3-R，真实 BFF）
 *
 * 发起转诊 → 随附资料获取与存储 → 接收（院外患者建档+生成本院就诊）
 * → 拒绝/完成/取消 状态机。
 * 对标国家医院智慧服务三级基本项目【3 转诊服务】。
 * 健康门禁：BFF/DB 不可用时显式 Alert + Watermark，阻断写操作。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { useEffect, useState } from 'react';
import { Alert, Layout, Spin, Tag, Typography, Watermark } from 'antd';
import { SwapOutlined } from '@ant-design/icons';
import { useReferralStore } from '@/store/referralStore';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import ReferralQueue from '@/components/referral/ReferralQueue';
import ReferralDetail from '@/components/referral/ReferralDetail';
import CreateReferralForm from '@/components/referral/CreateReferralForm';

const { Header, Content } = Layout;

const watermarkText = ['健澜科技', '双向转诊', 'jlmedaios'];

export default function ReferralPage() {
  const { dbUp, healthChecking, checkHealth, loadQueue, error, success, clearMessages } =
    useReferralStore();
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
            <SwapOutlined className="text-2xl text-white" />
            <Typography.Title level={4} className="!mb-0 !text-white">
              双向转诊 · 医联体协同
            </Typography.Title>
            <span className="hidden text-sm text-white/70 md:block">
              院外资料直接存储 · 接收生成本院就诊 · 状态机 + 哈希链留痕
            </span>
          </div>
          <Tag color={dbUp ? 'green' : 'red'} data-testid="ref-health-tag">
            {dbUp ? 'BFF/DB 正常 (up)' : 'BFF/DB 不可用'}
          </Tag>
        </Header>
        <Content className="p-4">
          <DemoModeBanner />
          <Spin spinning={!ready || healthChecking}>
            {error && (
              <Alert
                className="mb-3"
                type="error"
                showIcon
                message={error}
                closable
                onClose={clearMessages}
              />
            )}
            {success && (
              <Alert
                className="mb-3"
                type="success"
                showIcon
                message={success}
                closable
                onClose={clearMessages}
              />
            )}
            {!dbUp ? (
              <Alert
                data-testid="ref-offline-alert"
                type="error"
                showIcon
                banner
                message="无法连接 BFF 或数据库，转诊工作站不可用"
                description="请检查数据库服务；恢复后点击刷新重新探活。系统不会以缓存或假数据冒充转诊结果。"
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
              <div data-testid="ref-content">
                <CreateReferralForm />
                <ReferralQueue />
                <ReferralDetail />
              </div>
            )}
          </Spin>
        </Content>
      </Layout>
    </Watermark>
  );
}
