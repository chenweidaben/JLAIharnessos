/**
 * 健澜科技 jlmedaios - 运行病历质控页面（M2-B，真实 BFF）
 *
 * 三级质控：submitted→reviewed→signed→archived，退回 returned 整改重提。
 * 健康门禁：BFF/DB 不可用时显式 Alert + Watermark，阻断写操作。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { useEffect, useState } from 'react';
import {
  Alert,
  Layout,
  Spin,
  Tag,
  Typography,
  Watermark,
} from 'antd';
import { AuditOutlined } from '@ant-design/icons';
import { useMedicalQcStore } from '@/store/medicalQcStore';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import QcQueue from '@/components/medicalQc/QcQueue';
import QcDetail from '@/components/medicalQc/QcDetail';

const { Header, Content } = Layout;

const watermarkText = ['健澜科技', '病历质控', 'jlmedaios'];

export default function MedicalQcPage() {
  const {
    dbUp, healthChecking, checkHealth, loadQueue,
  } = useMedicalQcStore();
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
            <AuditOutlined className="text-2xl text-white" />
            <Typography.Title level={4} className="!mb-0 !text-white">
              运行病历质控 · 三级质控
            </Typography.Title>
            <span className="hidden text-sm text-white/70 md:block">
              规则引擎 + AI 辅助 · 质控医师签名 · 退回整改闭环
            </span>
          </div>
          <Tag color={dbUp ? 'green' : 'red'} data-testid="qc-health-tag">
            {dbUp ? 'BFF/DB 正常 (up)' : 'BFF/DB 不可用'}
          </Tag>
        </Header>
        <Content className="p-4">
          <DemoModeBanner />
          <Spin spinning={!ready || healthChecking}>
            {!dbUp ? (
              <Alert
                data-testid="qc-offline-alert"
                type="error"
                showIcon
                banner
                message="无法连接 BFF 或数据库，病历质控工作站不可用"
                description="请检查数据库服务；恢复后点击刷新重新探活。系统不会以缓存或假数据冒充质控结果。"
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
              <div data-testid="qc-content">
                <QcQueue />
                <QcDetail />
              </div>
            )}
          </Spin>
        </Content>
      </Layout>
    </Watermark>
  );
}