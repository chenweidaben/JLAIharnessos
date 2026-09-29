/**
 * 健澜科技 jlmedaios - 预约随访页面（M3-I，真实 BFF）
 *
 * 预约创建 → 确认 → 完成/缺席；随访计划 → 记录随访结果。
 * 健康门禁：BFF/DB 不可用时显式 Alert + Watermark，阻断写操作。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { useEffect, useState } from 'react';
import { Alert, Layout, Spin, Tag, Typography, Watermark } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import { useApptStore } from '@/store/apptStore';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import ApptQueue from '@/components/appt/ApptQueue';
import ApptCreateForm from '@/components/appt/ApptCreateForm';
import FollowUpPanel from '@/components/appt/FollowUpPanel';

const { Header, Content } = Layout;

const watermarkText = ['健澜科技', '预约随访', 'jlmedaios'];

export default function ApptPage() {
  const { dbUp, healthChecking, checkHealth, load } = useApptStore();
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
            <CalendarOutlined className="text-2xl text-white" />
            <Typography.Title level={4} className="!mb-0 !text-white">
              预约随访 · 全流程闭环
            </Typography.Title>
            <span className="hidden text-sm text-white/70 md:block">
              预约确认 · 到诊/缺席 · 随访计划 · 结果记录 · 哈希链留痕
            </span>
          </div>
          <Tag color={dbUp ? 'green' : 'red'} data-testid="appt-health-tag">
            {dbUp ? 'BFF/DB 正常 (up)' : 'BFF/DB 不可用'}
          </Tag>
        </Header>
        <Content className="p-4">
          <DemoModeBanner />
          <Spin spinning={!ready || healthChecking}>
            {!dbUp ? (
              <Alert
                data-testid="appt-offline-alert"
                type="error"
                showIcon
                banner
                message="无法连接 BFF 或数据库，预约随访工作站不可用"
                description="请检查数据库服务；恢复后点击刷新重新探活。系统不会以缓存或假数据冒充预约随访结果。"
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
              <div data-testid="appt-content">
                <ApptCreateForm />
                <ApptQueue />
                <FollowUpPanel />
              </div>
            )}
          </Spin>
        </Content>
      </Layout>
    </Watermark>
  );
}
