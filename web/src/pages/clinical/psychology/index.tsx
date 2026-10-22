/**
 * 健澜科技 jlmedaios - 心理科管理（M775）
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
import { usePsychPatientM775Store } from '@/store/psychPatientM775Store';
import type { PsychPatient } from '@/services/api/psychPatientM775';

const phqColor = (v: number) => (v >= 20 ? 'red' : v >= 15 ? 'volcano' : v >= 10 ? 'orange' : v >= 5 ? 'blue' : 'green');
const gadColor = (v: number) => (v >= 15 ? 'red' : v >= 10 ? 'orange' : v >= 5 ? 'blue' : 'green');

const consultColumns: ColumnsType<{ date: string; mode: string; topic: string }> = [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '方式', dataIndex: 'mode', width: 120 },
  { title: '议题', dataIndex: 'topic' },
];

const medColumns: ColumnsType<{ name: string; dose: string; start: string }> = [
  { title: '药品', dataIndex: 'name' },
  { title: '剂量', dataIndex: 'dose', width: 160 },
  { title: '起始', dataIndex: 'start', width: 120 },
];

const buildColumns = (setDetail: (r: PsychPatient) => void): ColumnsType<PsychPatient> => [
  { title: '住院号', dataIndex: 'inpatientNo', width: 130 },
  { title: '患者姓名', dataIndex: 'patient', width: 110 },
  { title: '诊断', dataIndex: 'diagnosis', width: 200, ellipsis: true },
  {
    title: 'PHQ-9',
    dataIndex: 'phq9',
    width: 90,
    align: 'right',
    render: (v: number) => <Tag color={phqColor(v)}>{v}</Tag>,
  },
  {
    title: 'GAD-7',
    dataIndex: 'gad7',
    width: 90,
    align: 'right',
    render: (v: number) => <Tag color={gadColor(v)}>{v}</Tag>,
  },
  { title: '治疗方式', dataIndex: 'treatment', width: 180, ellipsis: true },
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

export default function PsychologyM775Page() {
  usePageTitle('心理科管理');
  const { items, loading, error, demo, load } = usePsychPatientM775Store();
  const [detail, setDetail] = useState<PsychPatient | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="心理科管理"
      description="住院号 / 患者姓名 / 诊断 / PHQ-9 / GAD-7 / 治疗方式 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`心理患者（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1300 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="心理患者详情"
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
              <Descriptions.Item label="PHQ-9">
                <Tag color={phqColor(detail.phq9)}>{detail.phq9}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="GAD-7">
                <Tag color={gadColor(detail.gad7)}>{detail.gad7}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="心理评估" span={2}>{detail.assessment}</Descriptions.Item>
              <Descriptions.Item label="治疗方案" span={2}>{detail.plan}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="咨询记录" style={{ marginBottom: 16 }}>
              <Table rowKey="date" dataSource={detail.consults} columns={consultColumns} size="small" pagination={false} />
            </Card>
            <Card size="small" title="用药记录">
              <Table rowKey="name" dataSource={detail.medications} columns={medColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
