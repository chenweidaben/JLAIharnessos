/**
 * 健澜科技 jlmedaios - 互联网医院管理端页面（M3-J，真实 BFF）
 *
 * 医护线上执业资质审核（互联网医院准入）。
 * 健康门禁：BFF/DB 不可用时显式 Alert + Watermark，阻断写操作。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect, useState } from 'react';
import { Alert, Layout, Spin, Tag, Typography, Watermark } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { useInternetHospitalStore } from '@/store/internetHospitalStore';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import PractitionerList from '@/components/internetHospital/PractitionerList';

const { Header, Content } = Layout;

const watermarkText = ['健澜科技', '互联网医院', 'jlmedaios'];

export default function InternetHospitalPage() {
  const { dbUp, healthChecking, checkHealth, load } = useInternetHospitalStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      const up = await checkHealth();
      if (up) await load();
      setReady(true);
    })();
  }, [checkHealth, load]);

  const onRefresh = async () => {
    const up = await checkHealth();
    if (up) await load();
  };

  return (
    <Watermark content={watermarkText}>
      <Layout className="min-h-screen bg-ink-bg">
        <Header className="flex items-center justify-between bg-jl-primary px-6 shadow-card">
          <div className="flex items-center gap-3">
            <GlobalOutlined className="text-2xl text-white" />
            <Typography.Title level={4} className="!mb-0 !text-white">
              互联网医院 · 资质准入
            </Typography.Title>
            <span className="hidden text-sm text-white/70 md:block">
              线上执业资质 · 实名准入 · 审核留痕 · 哈希链
            </span>
          </div>
          <Tag color={dbUp ? 'green' : 'red'} data-testid="internet-health-tag">
            {dbUp ? 'BFF/DB 正常 (up)' : 'BFF/DB 不可用'}
          </Tag>
        </Header>
        <Content className="p-4">
          <DemoModeBanner />
          <Spin spinning={!ready || healthChecking}>
            {!dbUp ? (
              <Alert
                data-testid="internet-offline-alert"
                type="error"
                showIcon
                banner
                message="无法连接 BFF 或数据库，互联网医院资质管理不可用"
                description="请检查数据库服务；恢复后点击刷新重新探活。系统不会以缓存或假数据冒充资质审核结果。"
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
              <div data-testid="internet-content">
                <PractitionerList />
              </div>
            )}
          </Spin>
        </Content>
      </Layout>
    </Watermark>
  );
}
