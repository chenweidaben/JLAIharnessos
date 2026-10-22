/**
 * 健澜科技 jlmedaios - 护士站工作台（M673）
 *
 * 三甲流程：顶部 4 KPI 卡（在管数/特级/一级/待处理医嘱）+ 在管患者 Table（床号/姓名/诊断/护理等级）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect } from 'react';
import { Alert, Card, Col, Row, Spin, Statistic, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { useNurseWorkbenchM673Store } from '@/store/nurseWorkbenchM673Store';
import {
  CARE_LEVEL_META,
  type WardPatient,
} from '@/services/api/nurseWorkbenchM673';

const columns: ColumnsType<WardPatient> = [
  { title: '床号', dataIndex: 'bedNo', width: 90 },
  { title: '患者', dataIndex: 'name', width: 120 },
  { title: '住院号', dataIndex: 'patientId', width: 110 },
  { title: '诊断', dataIndex: 'diagnosis', ellipsis: true },
  {
    title: '护理等级',
    dataIndex: 'careLevel',
    width: 130,
    render: (v: WardPatient['careLevel']) => (
      <Tag color={CARE_LEVEL_META[v].color}>{CARE_LEVEL_META[v].label}</Tag>
    ),
  },
  { title: '入院日期', dataIndex: 'admissionDate', width: 120 },
];

export default function NurseWorkbenchM673Page() {
  usePageTitle('护士站工作台');

  const { ward, data, loading, error, demo, load } = useNurseWorkbenchM673Store();

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title={`护士站工作台 · ${ward}`}
      description="在管患者 / 护理等级 / 待处理医嘱"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic title="在管患者" value={data?.total ?? 0} suffix="人" />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="特级护理" value={data?.special ?? 0} suffix="人" valueStyle={{ color: '#cf1322' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="一级护理" value={data?.level1 ?? 0} suffix="人" valueStyle={{ color: '#fa8c16' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="待处理医嘱" value={data?.pendingOrders ?? 0} suffix="条" valueStyle={{ color: '#1677ff' }} />
          </Card>
        </Col>
      </Row>

      <Card size="small" title={`在管患者（${data?.patients.length ?? 0}）`}>
        <Spin spinning={loading}>
          <Table rowKey="bedNo" dataSource={data?.patients ?? []} columns={columns} size="small" pagination={false} />
        </Spin>
      </Card>
    </PageContainer>
  );
}
