/**
 * 健澜科技 jlmedaios - 患者端住院费用页（M50-A）
 * 押金余额 / 已产生费用 / 医保预估 / 自付预估
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Card, Col, Layout, List, Row, Statistic, Tag, Typography } from 'antd';
import { usePermission } from '@/router/guards';
import { usePatientBillingStore } from '@/store/patientBillingStore';
import { CATEGORY_LABEL, formatMoney } from '@/utils/patientBilling';
import type { BillingCategory } from '@/types/patientBilling';

const { Header, Content } = Layout;
const { Title } = Typography;

const CATEGORY_ORDER: BillingCategory[] = ['drug', 'exam', 'treatment', 'material', 'other'];

export default function PatientBillingPage() {
  const { dbUp, view, loading, error, checkHealth, load } = usePatientBillingStore();
  usePermission();
  // 患者端：占位 patientId（实际由就诊人上下文传入；此处取 URL/默认空，便于接入）
  const patientId = new URLSearchParams(window.location.search).get('patientId') ?? '';
  useEffect(() => { void checkHealth().then(() => load(patientId)); }, [checkHealth, load, patientId]);

  if (dbUp === false) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header><Title level={4} style={{ color: '#fff' }}>住院费用</Title></Header>
        <Content style={{ padding: 24, opacity: 0.4 }}><Alert type="error" showIcon message="数据库连接异常" /></Content>
      </Layout>
    );
  }
  if (dbUp === null) return null;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header><Title level={4} style={{ color: '#fff' }}>我的住院费用</Title></Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}
        {!view ? (
          <Card loading={loading}><Alert type="info" showIcon message="暂无在院费用记录" /></Card>
        ) : (
          <>
            <Row gutter={16}>
              <Col span={6}><Card><Statistic title="押金余额" value={formatMoney(view.deposit.balance)} precision={2}
                valueStyle={{ color: view.deposit.balance < 0 ? '#cf1322' : '#3f8600' }} /></Card></Col>
              <Col span={6}><Card><Statistic title="已产生费用" value={formatMoney(view.breakdown.total)} precision={2} /></Card></Col>
              <Col span={6}><Card><Statistic title="医保预估报销" value={formatMoney(view.insuranceEstimate.estimatedInsurancePaid)} precision={2} /></Card></Col>
              <Col span={6}><Card><Statistic title="自付预估" value={formatMoney(view.insuranceEstimate.patientOutOfPocket)} precision={2}
                valueStyle={{ color: '#cf1322' }} /></Card></Col>
            </Row>
            <Card title="费用分类汇总" style={{ marginTop: 16 }}>
              <List
                loading={loading}
                dataSource={CATEGORY_ORDER}
                renderItem={(cat) => (
                  <List.Item>
                    <span><Tag>{CATEGORY_LABEL[cat]}</Tag> ￥{formatMoney(view.breakdown.byCategory[cat])}</span>
                  </List.Item>
                )}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
