/**
 * 健澜科技 jlmedaios - 医生站工作台页（M79-A）
 * 首页工作台卡片：待办/告警/随访/KPI 红黄 Tag。
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Card, Col, Layout, Row, Statistic, Table, Tag, Typography } from 'antd';
import { usePermission } from '@/router/guards';
import { useDoctorWorkbenchStore } from '@/store/doctorWorkbenchStore';
import { riskTag } from '@/utils/doctorWorkbench';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function DoctorWorkbenchPage() {
  const { data, loading, error, load } = useDoctorWorkbenchStore();
  usePermission();
  useEffect(() => { void load(); }, [load]);

  const kpiColumns = [
    { title: '科室', dataIndex: 'department', key: 'department' },
    { title: '院感率', dataIndex: 'infectionRate', key: 'infectionRate' },
    { title: 'DDDs', dataIndex: 'ddds', key: 'ddds' },
    { title: '风险', dataIndex: 'risk', key: 'risk',
      render: (v: string) => <Tag color={riskTag(v as 'red' | 'yellow' | 'green')}>{v}</Tag> },
  ];

  return (
    <Layout className="jl-responsive" style={{ minHeight: '100vh' }}>
      <Header><Title level={4} style={{ color: '#fff' }}>医生站工作台</Title></Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} lg={6}><Card><Statistic title="待办工单" value={data?.openTasksCount ?? 0} /></Card></Col>
          <Col xs={24} sm={12} lg={6}><Card><Statistic title="未读通知" value={data?.unreadNotifications ?? 0} /></Card></Col>
          <Col xs={24} sm={12} lg={6}><Card><Statistic title="急诊在观" value={data?.activeObservations ?? 0} /></Card></Col>
          <Col xs={24} sm={12} lg={6}><Card><Statistic title="待确认治疗方案" value={data?.pendingPlans ?? 0} /></Card></Col>
        </Row>
        <Card title="科室 KPI（红黄标红）" className="jl-table-cards">
          <Table rowKey="department" loading={loading} columns={kpiColumns} dataSource={data?.departmentKpis ?? []} pagination={false} size="small" />
        </Card>
      </Content>
    </Layout>
  );
}
