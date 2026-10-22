/**
 * 健澜科技 jlmedaios - 风湿免疫科管理（M790）
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
import { useRheumPatientM790Store } from '@/store/rheumPatientM790Store';
import type { RheumPatient } from '@/services/api/rheumPatientM790';

const inflamColor = (v: number, ref: number) => (v >= ref * 2 ? 'red' : v >= ref ? 'orange' : 'green');
const das28Color = (v: number) => (v >= 5.1 ? 'red' : v >= 3.2 ? 'orange' : v >= 2.6 ? 'blue' : 'green');

const medColumns: ColumnsType<{ name: string; dose: string; start: string }> = [
  { title: '药品', dataIndex: 'name' },
  { title: '剂量', dataIndex: 'dose', width: 180 },
  { title: '起始', dataIndex: 'start', width: 120 },
];

const buildColumns = (setDetail: (r: RheumPatient) => void): ColumnsType<RheumPatient> => [
  { title: '住院号', dataIndex: 'inpatientNo', width: 130 },
  { title: '患者姓名', dataIndex: 'patient', width: 110 },
  { title: '诊断', dataIndex: 'diagnosis', width: 220, ellipsis: true },
  { title: '关节受累数', dataIndex: 'jointCount', width: 110, align: 'right' },
  {
    title: 'ESR',
    dataIndex: 'esr',
    width: 100,
    align: 'right',
    render: (v: number) => <Tag color={inflamColor(v, 20)}>{v}</Tag>,
  },
  {
    title: 'CRP',
    dataIndex: 'crp',
    width: 100,
    align: 'right',
    render: (v: number) => <Tag color={inflamColor(v, 8)}>{v}</Tag>,
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

export default function RheumatologyM790Page() {
  usePageTitle('风湿免疫科管理');
  const { items, loading, error, demo, load } = useRheumPatientM790Store();
  const [detail, setDetail] = useState<RheumPatient | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="风湿免疫科管理"
      description="住院号 / 患者姓名 / 诊断 / 关节受累数 / ESR / CRP / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`风湿患者（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1300 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="风湿患者详情"
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
              <Descriptions.Item label="DAS28 疾病活动度">
                <Tag color={das28Color(detail.das28)}>{detail.das28}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="治疗方案" span={2}>{detail.plan}</Descriptions.Item>
              <Descriptions.Item label="关节检查" span={2}>{detail.jointExam}</Descriptions.Item>
              <Descriptions.Item label="自身抗体" span={2}>{detail.autoantibodies}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="用药记录">
              <Table rowKey="name" dataSource={detail.medications} columns={medColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
