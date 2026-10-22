/**
 * 健澜科技 jlmedaios - 患者服务中心管理（M898）
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
import { usePatientServiceCenterWorkloadM898Store } from '@/store/patientServiceCenterWorkloadM898Store';
import type { PatientServiceCenterWorkload } from '@/services/api/patientServiceCenterWorkloadM898';

const simpleColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '项目', dataIndex: 'name' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: PatientServiceCenterWorkload) => void): ColumnsType<PatientServiceCenterWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '咨询人次', dataIndex: 'consultations', width: 110, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '投诉数', dataIndex: 'complaints', width: 100, align: 'right', render: (v: number) => <Tag color={v === 0 ? 'green' : 'red'}>{v}</Tag> },
  { title: '表扬数', dataIndex: 'praises', width: 100, align: 'right', render: (v: number) => <Tag color="orange">{v}</Tag> },
  { title: '随访人次', dataIndex: 'followups', width: 110, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  {
    title: '满意度评分',
    dataIndex: 'satisfaction',
    width: 130,
    align: 'right',
    render: (v: number) => <Tag color={v >= 95 ? 'green' : 'orange'}>{v}%</Tag>,
  },
  { title: '状态', dataIndex: 'status', width: 110 },
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

export default function PatientServiceCenterM898Page() {
  usePageTitle('患者服务中心管理');
  const { items, loading, error, demo, load } = usePatientServiceCenterWorkloadM898Store();
  const [detail, setDetail] = useState<PatientServiceCenterWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="患者服务中心管理"
      description="日期 / 咨询 / 投诉 / 表扬 / 随访 / 满意度 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`患者服务工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1400 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="患者服务工作详情"
        width={900}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="咨询人次">{detail.consultations}</Descriptions.Item>
              <Descriptions.Item label="投诉数">{detail.complaints}</Descriptions.Item>
              <Descriptions.Item label="表扬数">{detail.praises}</Descriptions.Item>
              <Descriptions.Item label="随访人次">{detail.followups}</Descriptions.Item>
              <Descriptions.Item label="满意度评分">{detail.satisfaction}%</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="表扬记录" span={2}>{detail.praiseRecords}</Descriptions.Item>
              <Descriptions.Item label="满意度调查" span={2}>{detail.satisfactionSurvey}</Descriptions.Item>
            </Descriptions>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Card size="small" title="咨询分类（流程/医保/结果/预约）">
                <Table rowKey="name" dataSource={detail.consultBreakdown} columns={simpleColumns} size="small" pagination={false} />
              </Card>
              <Card size="small" title="投诉分类（态度/环境/费用/等待）">
                <Table rowKey="name" dataSource={detail.complaintBreakdown} columns={simpleColumns} size="small" pagination={false} />
              </Card>
              <Card size="small" title="随访管理（出院/慢病/术后）">
                <Table rowKey="name" dataSource={detail.followupBreakdown} columns={simpleColumns} size="small" pagination={false} />
              </Card>
            </div>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
