/**
 * 健澜科技 jlmedaios - 满意度评价页面（M3-O，真实 BFF）
 *
 * 患者评价（多维度星级 + 评论）/ 医护统计（平均分、好评率、明细）。
 * 健康门禁：BFF/DB 不可用时显式 Alert + Watermark，阻断写操作。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { useEffect, useState } from 'react';
import {
  Alert,
  Layout,
  Spin,
  Tabs,
  Tag,
  Typography,
  Watermark,
} from 'antd';
import { SmileOutlined } from '@ant-design/icons';
import { useSatisfactionStore } from '@/store/satisfactionStore';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import SatisfactionStatsPanel from '@/components/satisfaction/SatisfactionStatsPanel';

const { Header, Content } = Layout;

const watermarkText = ['健澜科技', '满意度评价', 'jlmedaios'];

export default function SatisfactionPage() {
  const { healthOk, checking, checkHealth } = useSatisfactionStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      await checkHealth();
      setReady(true);
    })();
  }, [checkHealth]);

  const onRefresh = async () => {
    await checkHealth();
  };

  return (
    <Watermark content={watermarkText}>
      <Layout className="min-h-screen bg-ink-bg">
        <Header className="flex items-center justify-between bg-jl-primary px-6 shadow-card">
          <div className="flex items-center gap-3">
            <SmileOutlined className="text-2xl text-white" />
            <Typography.Title level={4} className="!mb-0 !text-white">
              满意度评价 · 服务改进闭环
            </Typography.Title>
            <span className="hidden text-sm text-white/70 md:block">
              多维度评分 · 意见建议 · 统计分析 · 哈希链留痕
            </span>
          </div>
          <Tag color={healthOk ? 'green' : 'red'} data-testid="satisfaction-health-tag">
            {healthOk ? 'BFF/DB 正常 (up)' : 'BFF/DB 不可用'}
          </Tag>
        </Header>
        <Content className="p-4">
          <DemoModeBanner />
          <Spin spinning={!ready || checking}>
            {!healthOk ? (
              <Alert
                data-testid="satisfaction-offline-alert"
                type="error"
                showIcon
                banner
                message="无法连接 BFF 或数据库，满意度评价工作站不可用"
                description="请检查数据库服务；恢复后点击刷新重新探活。系统不会以缓存或假数据冒充满意度评价/统计结果。"
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
              <div data-testid="satisfaction-content">
                <Tabs
                  defaultActiveKey="stats"
                  items={[
                    {
                      key: 'stats',
                      label: '满意度统计',
                      children: <SatisfactionStatsPanel />,
                    },
                    {
                      key: 'survey',
                      label: '患者评价（示例）',
                      children: (
                        <Alert
                          type="info"
                          showIcon
                          message="实际患者评价入口在就诊完成后由患者端发起"
                          description="此页为工作站演示；患者在互联网医院/就诊结束后可对本次就诊或问诊进行一次评价。"
                        />
                      ),
                    },
                  ]}
                />
              </div>
            )}
          </Spin>
        </Content>
      </Layout>
    </Watermark>
  );
}
