/**
 * 健澜科技 jlmedaios - 麻醉记录单（M684）
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
import dayjs from 'dayjs';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { useAnesthesiaRecordM684Store } from '@/store/anesthesiaRecordM684Store';
import {
  ANESTHESIA_TYPE_META,
  type AnesthesiaRecord,
  type VitalsPoint,
} from '@/services/api/anesthesiaRecordM684';

const vitalsColumns: ColumnsType<VitalsPoint> = [
  { title: '时间', dataIndex: 'time', width: 80 },
  { title: 'HR', dataIndex: 'heartRate', width: 80, align: 'right' },
  { title: 'SBP', dataIndex: 'sbp', width: 80, align: 'right' },
  { title: 'DBP', dataIndex: 'dbp', width: 80, align: 'right' },
  { title: 'SpO₂', dataIndex: 'spo2', width: 80, align: 'right', render: (v: number) => `${v}%` },
  { title: 'RR', dataIndex: 'respRate', width: 80, align: 'right' },
];

const buildColumns = (setDetail: (r: AnesthesiaRecord) => void): ColumnsType<AnesthesiaRecord> => [
  { title: '记录号', dataIndex: 'id', width: 100 },
  { title: '患者', dataIndex: 'patientId', width: 100 },
  { title: '手术名称', dataIndex: 'surgeryName', ellipsis: true },
  {
    title: '麻醉方式',
    dataIndex: 'anesthesiaType',
    width: 110,
    render: (v: AnesthesiaRecord['anesthesiaType']) => <Tag color={ANESTHESIA_TYPE_META[v].color}>{ANESTHESIA_TYPE_META[v].label}</Tag>,
  },
  { title: 'ASA', dataIndex: 'asaClass', width: 80 },
  { title: '麻醉医师', dataIndex: 'anesthetist', width: 110 },
  {
    title: '起止时间',
    width: 220,
    render: (_v, row) => (
      <span style={{ color: '#666' }}>
        {dayjs(row.startedAt).format('MM-DD HH:mm')} ~ {dayjs(row.endedAt).format('HH:mm')}
      </span>
    ),
  },
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

export default function AnesthesiaRecordM684Page() {
  usePageTitle('麻醉记录单');
  const { items, loading, error, demo, load } = useAnesthesiaRecordM684Store();
  const [detail, setDetail] = useState<AnesthesiaRecord | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="麻醉记录单"
      description="患者 / 手术名称 / 麻醉方式 / 麻醉医师"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`麻醉记录（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="麻醉记录详情"
        width={780}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="患者 ID">{detail.patientId}</Descriptions.Item>
              <Descriptions.Item label="手术名称">{detail.surgeryName}</Descriptions.Item>
              <Descriptions.Item label="麻醉方式">
                <Tag color={ANESTHESIA_TYPE_META[detail.anesthesiaType].color}>{ANESTHESIA_TYPE_META[detail.anesthesiaType].label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="ASA 分级">{detail.asaClass}</Descriptions.Item>
              <Descriptions.Item label="麻醉医师">{detail.anesthetist}</Descriptions.Item>
              <Descriptions.Item label="出入量">入 {detail.intakeMl}ml / 出 {detail.outputMl}ml</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="麻醉用药" style={{ marginBottom: 16 }}>
              {detail.meds.map((m) => (
                <div key={m}>· {m}</div>
              ))}
            </Card>
            <Card size="small" title="生命体征时间轴">
              <Table rowKey="time" dataSource={detail.vitals} columns={vitalsColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
