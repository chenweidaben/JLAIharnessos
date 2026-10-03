/* ============================================================================
 * 健澜科技杠OS - EMPI 患者主索引页面（M5-C，真实 BFF）
 *
 * 标识登记 → 扫描匹配（确定性引擎生成候选）→ 人工审核确认/拒绝 → 逻辑链接。
 * 健康门禁：BFF/DB 不可用时显式 Alert + Watermark，阻断写操作。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 * ==========================================================================*/

import { useEffect, useState } from 'react';
import {
  Alert, Button, Layout, Space, Spin, Tag, Typography, Watermark,
} from 'antd';
import { IdcardOutlined, ScanOutlined } from '@ant-design/icons';
import { useEmpiStore } from '@/store/empiStore';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import CandidatePanel from '@/components/empi/CandidatePanel';
import LinkPanel from '@/components/empi/LinkPanel';

const { Header, Content } = Layout;

const watermarkText = ['健澜科技', '患者主索引', 'jlmedaios'];

export default function EmpiPage() {
  const {
    dbUp, healthChecking, scanning, checkHealth, loadAll, runScan,
  } = useEmpiStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      const up = await checkHealth();
      if (up) await loadAll();
      setReady(true);
    })();
  }, [checkHealth, loadAll]);

  const onRefresh = async () => {
    const up = await checkHealth();
    if (up) await loadAll();
  };

  return (
    <Watermark content={watermarkText}>
      <Layout className="min-h-screen bg-ink-bg">
        <Header className="flex items-center justify-between bg-jl-primary px-6 shadow-card">
          <div className="flex items-center gap-3">
            <IdcardOutlined className="text-2xl text-white" />
            <Typography.Title level={4} className="!mb-0 !text-white">
              患者主索引 EMPI · 标识登记-匹配-审核-链接
            </Typography.Title>
            <span className="hidden text-sm text-white/70 md:block">
              确定性匹配 · 人工审核 · 逻辑链接不物理合并
            </span>
          </div>
          <Tag color={dbUp ? 'green' : 'red'} data-testid="empi-health-tag">
            {dbUp ? 'BFF/DB 正常 (up)' : 'BFF/DB 不可用'}
          </Tag>
        </Header>
        <Content className="p-4">
          <DemoModeBanner />
          <Spin spinning={!ready || healthChecking}>
            {!dbUp ? (
              <Alert
                data-testid="empi-offline-alert"
                type="error"
                showIcon
                banner
                message="无法连接 BFF 或数据库，EMPI 工作站不可用"
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
              <div data-testid="empi-content">
                <Space className="mb-4">
                  <Button
                    type="primary"
                    icon={<ScanOutlined />}
                    loading={scanning}
                    onClick={() => void runScan()}
                  >
                    扫描患者生成匹配
                  </Button>
                </Space>
                <CandidatePanel />
                <div className="mt-4">
                  <LinkPanel />
                </div>
              </div>
            )}
          </Spin>
        </Content>
      </Layout>
    </Watermark>
  );
}
