/**
 * 健澜科技 jlmedaios - 职业健康管理（M910）
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
import { useOccupationalHealthWorkloadM910Store } from '@/store/occupationalHealthWorkloadM910Store';
import type { OccupationalHealthWorkload } from '@/services/api/occupationalHealthWorkloadM910';

const exposureColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '暴露分类', dataIndex: 'name' },
  { title: '次数', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: OccupationalHealthWorkload) => void): ColumnsType<OccupationalHealthWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  {
    title: '职业暴露数',
    dataIndex: 'exposures',
    width: 130,
    align: 'right',
    render: (v: number) => <Tag color={v === 0 ? 'green' : 'orange'}>{v}</Tag>,
  },
  { title: '职业健康体检人数', dataIndex: 'physicalExam', width: 180, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  {
    title: '职业病诊断数',
    dataIndex: 'occupationalDiseases',
    width: 150,
    align: 'right',
    render: (v: number) => <Tag color={v === 0 ? 'green' : 'red'}>{v}</Tag>,
  },
  { title: '工伤认定数', dataIndex: 'workInjury', width: 130, align: 'right', render: (v: number) => <Tag color="orange">{v}</Tag> },
  { title: '职业防护培训人次', dataIndex: 'trainingVisits', width: 180, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
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

export default function OccupationalHealthM910Page() {
  usePageTitle('职业健康管理');
  const { items, loading, error, demo, load } = useOccupationalHealthWorkloadM910Store();
  const [detail, setDetail] = useState<OccupationalHealthWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="职业健康管理"
      description="日期 / 职业暴露 / 健康体检 / 职业病 / 工伤 / 防护培训 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`职业健康工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1700 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="职业健康工作详情"
        width={920}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="职业暴露数">{detail.exposures}</Descriptions.Item>
              <Descriptions.Item label="职业健康体检人数">{detail.physicalExam}</Descriptions.Item>
              <Descriptions.Item label="职业病诊断数">{detail.occupationalDiseases}</Descriptions.Item>
              <Descriptions.Item label="工伤认定数">{detail.workInjury}</Descriptions.Item>
              <Descriptions.Item label="职业防护培训人次">{detail.trainingVisits}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="暴露后处置" span={2}>{detail.postExposure}</Descriptions.Item>
              <Descriptions.Item label="职业健康体检（上岗前/在岗/离岗）" span={2}>{detail.physicalExamDetail}</Descriptions.Item>
              <Descriptions.Item label="职业病诊断与鉴定" span={2}>{detail.diseaseDiagnosis}</Descriptions.Item>
              <Descriptions.Item label="工伤认定与待遇" span={2}>{detail.workInjuryBenefits}</Descriptions.Item>
              <Descriptions.Item label="职业防护培训记录" span={2}>{detail.trainingRecords}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="职业暴露分类（针刺/血液体液/化学/放射）">
              <Table rowKey="name" dataSource={detail.exposureBreakdown} columns={exposureColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
