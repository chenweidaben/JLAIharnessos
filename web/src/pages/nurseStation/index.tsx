/**
 * 健澜科技 jlmedaios - 护士站四合一屏（M18-B）
 *
 * 左栏在院患者床旁列表（按 outstanding 倒序，hard CDS/高危红标）；右栏选中患者一览。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Card, Col, Layout, List, Row, Tag, Typography } from 'antd';
import { usePermission } from '@/router/guards';
import { useNurseStationStore } from '@/store/nurseStationStore';
import type { WardRow } from '@/types/nurseStation';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function NurseStationPage() {
  const { dbUp, health, items, loading, error, checkHealth, load } = useNurseStationStore();
  const [sel, setSel] = useState<WardRow | null>(null);
  usePermission();

  useEffect(() => { void checkHealth().then(() => load()); }, [checkHealth, load]);

  if (dbUp === false) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header><Title level={4} style={{ color: '#fff' }}>护士站</Title></Header>
        <Content style={{ padding: 24, opacity: 0.4 }}>
          <Alert type="error" showIcon message="数据库连接异常" description={error || `db=${health?.db ?? '?'}`} />
        </Content>
      </Layout>
    );
  }
  if (dbUp === null) return null;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header><Title level={4} style={{ color: '#fff' }}>护士站床旁一览</Title></Header>
      <Content style={{ padding: 16 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}
        <Row gutter={16}>
          <Col span={10}>
            <Card size="small" title={`在院患者（${items.length}）`} loading={loading}>
              <List
                dataSource={items}
                rowKey="visitId"
                renderItem={(it) => (
                  <List.Item onClick={() => setSel(it)} style={{ cursor: 'pointer', background: sel?.visitId === it.visitId ? '#e6f4ff' : undefined }}>
                    <List.Item.Meta
                      title={<span>{it.bedNo ?? '—'} · {it.patientName}
                        {it.unresolvedHardCds > 0 && <Tag color="red" style={{ marginLeft: 8 }}>CDS×{it.unresolvedHardCds}</Tag>}
                        {it.riskLevel === 'high' && <Tag color="orange" style={{ marginLeft: 4 }}>高危</Tag>}
                      </span>}
                      description={`T=${it.latestVitals.temperature ?? '—'} P=${it.latestVitals.pulse ?? '—'} 平衡=${it.ioBalance24h ?? '—'}ml 待给药=${it.pendingMeds} 管路=${it.activeTubes}`}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>
          <Col span={14}>
            {sel ? (
              <Card size="small" title={`${sel.patientName} · ${sel.bedNo ?? '—'}`}>
                <p>最新体征：T={sel.latestVitals.temperature ?? '—'} BP={sel.latestVitals.sbp ?? '—'} P={sel.latestVitals.pulse ?? '—'}</p>
                <p>24h 出入量平衡：{sel.ioBalance24h ?? '—'} ml</p>
                <p>待给药 {sel.pendingMeds} · 在院管路 {sel.activeTubes} · 风险 {sel.riskLevel} · 未处理 hard CDS {sel.unresolvedHardCds}</p>
              </Card>
            ) : <Card size="small">点击左侧患者查看详情</Card>}
          </Col>
        </Row>
      </Content>
    </Layout>
  );
}
