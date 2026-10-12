/**
 * 健澜科技 jlmedaios - 在院费用监控看板（M22-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Button, Layout, List, Tag, Typography } from 'antd';
import { usePermission } from '@/router/guards';
import { useInpatientCostStore } from '@/store/inpatientCostMonitorStore';

const { Header, Content } = Layout;
const { Title } = Typography;

const LEVEL_COLOR: Record<string, string> = { over: 'red', warn: 'orange', ok: 'green' };

export default function InpatientCostMonitorPage() {
  const { dbUp, monitors, loading, error, checkHealth, load, review } = useInpatientCostStore();
  usePermission();
  useEffect(() => { void checkHealth().then(() => load()); }, [checkHealth, load]);

  if (dbUp === false) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header><Title level={4} style={{ color: '#fff' }}>在院费用监控</Title></Header>
        <Content style={{ padding: 24, opacity: 0.4 }}><Alert type="error" showIcon message="数据库连接异常" /></Content>
      </Layout>
    );
  }
  if (dbUp === null) return null;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header><Title level={4} style={{ color: '#fff' }}>在院病例费用实时监控（事中）</Title></Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}
        <List
          loading={loading}
          dataSource={monitors}
          renderItem={(it) => (
            <List.Item
              actions={[
                it.level !== 'ok' && !it.dischargeReviewReminded
                  ? <Button size="small" onClick={() => void review(it.visitId)}>出院提醒</Button>
                  : <Button size="small" disabled>已提醒</Button>,
              ]}
            >
              <List.Item.Meta
                title={<span>就诊 {it.visitId.slice(0, 8)} <Tag color={LEVEL_COLOR[it.level]}>{it.level}</Tag></span>}
                description={`累计 ${it.accumulatedCost} / 预算 ${it.budgetCost ?? '-'} · 比 ${it.ratio ?? '-'} · ${new Date(it.lastSnapshotAt).toLocaleString()}`}
              />
            </List.Item>
          )}
        />
      </Content>
    </Layout>
  );
}
