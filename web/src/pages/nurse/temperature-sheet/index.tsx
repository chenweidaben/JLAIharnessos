/**
 * 健澜科技 jlmedaios - 体温单（M693）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Modal,
  Spin,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { useTemperatureSheetM693Store } from '@/store/temperatureSheetM693Store';
import type {
  IntakeOutput,
  TemperatureSheet,
  VitalsPoint,
} from '@/services/api/temperatureSheetM693';

const vitalsColumns: ColumnsType<VitalsPoint> = [
  { title: '时间', dataIndex: 'time', width: 140 },
  { title: '体温(℃)', dataIndex: 'temperature', width: 100, align: 'right', render: (v: number) => (
    <span style={{ color: v >= 38 ? '#cf1322' : v >= 37.3 ? '#fa8c16' : 'inherit' }}>{v}</span>
  ) },
  { title: '脉搏(bpm)', dataIndex: 'pulse', width: 100, align: 'right' },
  { title: '呼吸(/min)', dataIndex: 'respRate', width: 100, align: 'right' },
  { title: '收缩压', dataIndex: 'sbp', width: 90, align: 'right' },
  { title: '舒张压', dataIndex: 'dbp', width: 90, align: 'right' },
];

const ioColumns: ColumnsType<IntakeOutput> = [
  { title: '日期', dataIndex: 'date', width: 140 },
  { title: '入量(ml)', dataIndex: 'intakeMl', width: 120, align: 'right' },
  { title: '出量(ml)', dataIndex: 'outputMl', width: 120, align: 'right' },
  {
    title: '平衡(ml)',
    width: 120,
    align: 'right',
    render: (_v, row) => {
      const bal = row.intakeMl - row.outputMl;
      return <span style={{ color: bal >= 0 ? '#3f8600' : '#cf1322' }}>{bal > 0 ? '+' : ''}{bal}</span>;
    },
  },
];

const buildColumns = (setDetail: (r: TemperatureSheet) => void): ColumnsType<TemperatureSheet> => [
  { title: '住院号', dataIndex: 'inpatientNo', width: 120 },
  { title: '患者', dataIndex: 'patientId', width: 100 },
  { title: '入院日期', dataIndex: 'admissionDate', width: 120 },
  {
    title: '当前体温(℃)',
    dataIndex: 'currentTemp',
    width: 130,
    align: 'right',
    render: (v: number) => (
      <Tag color={v >= 38 ? 'red' : v >= 37.3 ? 'orange' : 'green'}>{v} ℃</Tag>
    ),
  },
  { title: '当前脉搏', dataIndex: 'currentPulse', width: 110, align: 'right', render: (v: number) => `${v} bpm` },
  {
    title: '操作',
    width: 90,
    render: (_v, row) => (
      <Button type="link" size="small" onClick={() => setDetail(row)}>
        详情
      </Button>
    ),
  },
];

export default function TemperatureSheetM693Page() {
  usePageTitle('体温单');
  const { items, loading, error, demo, load } = useTemperatureSheetM693Store();
  const [detail, setDetail] = useState<TemperatureSheet | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="体温单"
      description="住院号 / 患者 / 入院日期 / 当前体温 / 脉搏"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`体温单（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="体温单详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={3} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="住院号">{detail.inpatientNo}</Descriptions.Item>
              <Descriptions.Item label="患者 ID">{detail.patientId}</Descriptions.Item>
              <Descriptions.Item label="入院日期">{detail.admissionDate}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="生命体征时间轴" style={{ marginBottom: 16 }}>
              <Table rowKey="time" dataSource={detail.vitals} columns={vitalsColumns} size="small" pagination={false} />
            </Card>
            <Card size="small" title="出入量记录">
              <Table rowKey="date" dataSource={detail.ioRecords} columns={ioColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
