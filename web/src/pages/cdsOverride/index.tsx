/**
 * 健澜科技 jlmedaios - 医嘱开方 CDS 审计屏（M18-A）
 *
 * 健康门禁：db!=='up' 显式红 Alert + 水印，不渲染业务数据。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Layout, Table, Tag, Typography } from 'antd';
import { usePermission } from '@/router/guards';
import { useOrderCdsStore } from '@/store/orderCdsStore';
import { ruleLabel, severityColor, severityLabel } from '@/utils/orderCds';
import type { CdsSeverity } from '@/types/orderCds';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function CdsOverridePage() {
  const { dbUp, health, alerts, unresolvedHard, loading, error, checkHealth } = useOrderCdsStore();
  usePermission();

  useEffect(() => { void checkHealth(); }, [checkHealth]);

  if (dbUp === false) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header><Title level={4} style={{ color: '#fff' }}>CDS 拦截</Title></Header>
        <Content style={{ padding: 24, opacity: 0.4 }}>
          <Alert type="error" showIcon message="数据库连接异常" description={error || `db=${health?.db ?? '?'}`} />
        </Content>
      </Layout>
    );
  }
  if (dbUp === null) return null;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header><Title level={4} style={{ color: '#fff' }}>医嘱开方 CDS 拦截与 override</Title></Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}
        <Alert type={unresolvedHard > 0 ? 'warning' : 'success'} showIcon style={{ marginBottom: 16 }}
          message={`未 override 的 hard 拦截：${unresolvedHard}`} />
        <Table rowKey="id" loading={loading} dataSource={alerts} pagination={{ pageSize: 10 }}
          columns={[
            { title: '规则', dataIndex: 'ruleCode', render: (r: string) => ruleLabel(r) },
            { title: '级别', dataIndex: 'severity', render: (s: CdsSeverity) => <Tag color={severityColor(s)}>{severityLabel(s)}</Tag> },
            { title: '信息', dataIndex: 'message' },
            { title: 'override', dataIndex: 'overrideReason', render: (v, r) => v ? <span>{v}</span> : (r.severity === 'hard' ? <Tag color="red">未放行</Tag> : <Tag>—</Tag>) },
          ]} />
      </Content>
    </Layout>
  );
}
