/**
 * 健澜科技 jlmedaios - 疼痛门诊页（M52-A）
 * NRS 滴定记录、爆发痛计数、镇痛调整建议。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Card, Col, Layout, List, Row, Statistic, Tag, Typography } from 'antd';
import { usePermission } from '@/router/guards';
import { usePainStore } from '@/store/painClinicStore';
import { nrsLevel } from '@/utils/painClinic';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function PainClinicPage() {
  const { dbUp, items, loading, error, checkHealth, setPatient } = usePainStore();
  usePermission();
  const patientId = new URLSearchParams(window.location.search).get('patientId') ?? '';
  useEffect(() => { void checkHealth().then(() => setPatient(patientId)); }, [checkHealth, setPatient, patientId]);

  if (dbUp === false) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header><Title level={4} style={{ color: '#fff' }}>疼痛门诊</Title></Header>
        <Content style={{ padding: 24, opacity: 0.4 }}><Alert type="error" showIcon message="数据库连接异常" /></Content>
      </Layout>
    );
  }
  if (dbUp === null) return null;

  const latest = items[0];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header><Title level={4} style={{ color: '#fff' }}>癌痛滴定门诊</Title></Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}
        {latest && (
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}><Card><Statistic title="当前 NRS" value={latest.currentNrs} suffix={nrsLevel(latest.currentNrs)} /></Card></Col>
            <Col span={6}><Card><Statistic title="基线 NRS" value={latest.baselineNrs} /></Card></Col>
            <Col span={6}><Card><Statistic title="爆发痛次数" value={latest.breakthroughCount} /></Card></Col>
            <Col span={6}><Card><Statistic title="滴定轮次" value={latest.titrationRound} /></Card></Col>
          </Row>
        )}
        <Card title="镇痛调整建议记录">
          <List
            loading={loading}
            dataSource={items}
            renderItem={(it) => (
              <List.Item>
                <List.Item.Meta
                  title={
                    <span>
                      NRS {it.baselineNrs}→{it.currentNrs}
                      <Tag color={it.currentNrs >= 7 ? 'red' : it.currentNrs >= 4 ? 'orange' : 'green'}>
                        {nrsLevel(it.currentNrs)}
                      </Tag>
                    </span>
                  }
                  description={
                    <span>
                      {it.analgesic}
                      {it.doseNote ? ` · ${it.doseNote}` : ''}
                      {it.adjustmentSuggestion ? ` · 建议：${it.adjustmentSuggestion}` : ''}
                    </span>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      </Content>
    </Layout>
  );
}
