/**
 * 健澜科技 jlmedaios - 患者端门户首页页（M80-A）
 * 首页卡片：复诊/报告/通知/押金/随访/满意度。
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Card, Col, Layout, Row, Statistic, Typography } from 'antd';
import { usePermission } from '@/router/guards';
import { usePatientPortalStore } from '@/store/patientPortalStore';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function PatientPortalPage() {
  const { data, loading, error, load } = usePatientPortalStore();
  usePermission();
  useEffect(() => { void load(); }, [load]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header><Title level={4} style={{ color: '#fff' }}>患者首页</Title></Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}
        <Row gutter={16}>
          <Col span={8}><Card loading={loading}><Statistic title="已约复诊" value={data?.upcomingAppointments ?? 0} /></Card></Col>
          <Col span={8}><Card loading={loading}><Statistic title="未读报告" value={data?.unreadReportsCount ?? 0} /></Card></Col>
          <Col span={8}><Card loading={loading}><Statistic title="未读通知" value={data?.unreadNotificationsCount ?? 0} /></Card></Col>
          <Col span={8}><Card loading={loading}><Statistic title="押金余额" value={data?.depositBalance ?? 0} /></Card></Col>
          <Col span={8}><Card loading={loading}><Statistic title="慢病随访待填" value={data?.pendingFollowups ?? 0} /></Card></Col>
          <Col span={8}><Card loading={loading}><Statistic title="满意度待填" value={data?.pendingSurveys ?? 0} /></Card></Col>
        </Row>
      </Content>
    </Layout>
  );
}
