/**
 * 健澜科技 jlmedaios - 危重患者护理记录（M697）
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
import { useCriticalCareRecordM697Store } from '@/store/criticalCareRecordM697Store';
import {
  CARE_LEVEL_META,
  type CriticalCareRecord,
  type CriticalCareVitals,
} from '@/services/api/criticalCareRecordM697';

const vitalsColumns: ColumnsType<CriticalCareVitals> = [
  { title: '时间', dataIndex: 'time', width: 100 },
  { title: 'HR(bpm)', dataIndex: 'heartRate', width: 100, align: 'right' },
  { title: 'SBP', dataIndex: 'sbp', width: 90, align: 'right' },
  { title: 'DBP', dataIndex: 'dbp', width: 90, align: 'right' },
  { title: 'SpO₂', dataIndex: 'spo2', width: 100, align: 'right', render: (v: number) => `${v}%` },
];

const buildColumns = (setDetail: (r: CriticalCareRecord) => void): ColumnsType<CriticalCareRecord> => [
  { title: '床号', dataIndex: 'bedNo', width: 100 },
  { title: '患者', dataIndex: 'patientId', width: 100 },
  { title: '诊断', dataIndex: 'diagnosis', ellipsis: true },
  { title: '记录时间', dataIndex: 'recordedAt', width: 150, render: (v: string) => dayjs(v).format('MM-DD HH:mm') },
  {
    title: '护理级别',
    dataIndex: 'careLevel',
    width: 120,
    render: (v: CriticalCareRecord['careLevel']) => <Tag color={CARE_LEVEL_META[v].color}>{CARE_LEVEL_META[v].label}</Tag>,
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

export default function CriticalCareRecordM697Page() {
  usePageTitle('危重患者护理记录');
  const { items, loading, error, demo, load } = useCriticalCareRecordM697Store();
  const [detail, setDetail] = useState<CriticalCareRecord | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="危重患者护理记录"
      description="床号 / 患者 / 诊断 / 记录时间 / 护理级别"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`危重护理记录（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1000 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="危重护理记录详情"
        width={780}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="床号">{detail.bedNo}</Descriptions.Item>
              <Descriptions.Item label="患者 ID">{detail.patientId}</Descriptions.Item>
              <Descriptions.Item label="诊断" span={2}>{detail.diagnosis}</Descriptions.Item>
              <Descriptions.Item label="护理级别">
                <Tag color={CARE_LEVEL_META[detail.careLevel].color}>{CARE_LEVEL_META[detail.careLevel].label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="记录时间">{dayjs(detail.recordedAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="生命体征" style={{ marginBottom: 16 }}>
              <Table rowKey="time" dataSource={detail.vitals} columns={vitalsColumns} size="small" pagination={false} />
            </Card>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="管路护理">
                {detail.lines.map((l) => <div key={l}>· {l}</div>)}
              </Descriptions.Item>
              <Descriptions.Item label="皮肤情况">{detail.skinCondition}</Descriptions.Item>
              <Descriptions.Item label="护理措施">
                {detail.nursingMeasures.map((m) => <div key={m}>· {m}</div>)}
              </Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
