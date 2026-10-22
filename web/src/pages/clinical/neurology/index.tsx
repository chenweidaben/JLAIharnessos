/**
 * 健澜科技 jlmedaios - 神经内科管理（M786）
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
import { useNeuroPatientM786Store } from '@/store/neuroPatientM786Store';
import type { NeuroPatient } from '@/services/api/neuroPatientM786';

const gcsColor = (v: number) => (v <= 8 ? 'red' : v <= 12 ? 'orange' : 'green');
const nihssColor = (v: number) => (v >= 16 ? 'red' : v >= 5 ? 'orange' : 'green');

const recColumns: ColumnsType<{ date: string; action: string; outcome: string }> = [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '处理', dataIndex: 'action' },
  { title: '转归', dataIndex: 'outcome' },
];

const buildColumns = (setDetail: (r: NeuroPatient) => void): ColumnsType<NeuroPatient> => [
  { title: '住院号', dataIndex: 'inpatientNo', width: 130 },
  { title: '患者姓名', dataIndex: 'patient', width: 110 },
  { title: '诊断', dataIndex: 'diagnosis', width: 240, ellipsis: true },
  {
    title: 'GCS',
    dataIndex: 'gcs',
    width: 90,
    align: 'right',
    render: (v: number) => <Tag color={gcsColor(v)}>{v}</Tag>,
  },
  {
    title: 'NIHSS',
    dataIndex: 'nihss',
    width: 90,
    align: 'right',
    render: (v: number) => <Tag color={nihssColor(v)}>{v}</Tag>,
  },
  { title: '状态', dataIndex: 'status', width: 100 },
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

export default function NeurologyM786Page() {
  usePageTitle('神经内科管理');
  const { items, loading, error, demo, load } = useNeuroPatientM786Store();
  const [detail, setDetail] = useState<NeuroPatient | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="神经内科管理"
      description="住院号 / 患者姓名 / 诊断 / GCS 评分 / NIHSS 评分 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`神内患者（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1200 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="神内患者详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="住院号">{detail.inpatientNo}</Descriptions.Item>
              <Descriptions.Item label="患者姓名">{detail.patient}</Descriptions.Item>
              <Descriptions.Item label="诊断" span={2}>{detail.diagnosis}</Descriptions.Item>
              <Descriptions.Item label="GCS">
                <Tag color={gcsColor(detail.gcs)}>{detail.gcs}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="NIHSS">
                <Tag color={nihssColor(detail.nihss)}>{detail.nihss}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="头颅 CT / MRI" span={2}>{detail.imaging}</Descriptions.Item>
              <Descriptions.Item label="脑电图" span={2}>{detail.eeg}</Descriptions.Item>
              <Descriptions.Item label="肌力分级" span={2}>{detail.muscleStrength}</Descriptions.Item>
              <Descriptions.Item label="康复评估" span={2}>{detail.rehab}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="治疗记录">
              <Table rowKey="date" dataSource={detail.records} columns={recColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
