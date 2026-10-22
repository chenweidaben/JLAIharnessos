/**
 * 健澜科技 jlmedaios - 心理科管理（M857 原地升级 M827 视图）
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
import { usePsychologyWorkloadM857Store } from '@/store/psychologyWorkloadM857Store';
import type { PsychologyWorkloadM857 } from '@/services/api/psychologyWorkloadM857';

const diseaseColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '疾病类型', dataIndex: 'name' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: PsychologyWorkloadM857) => void): ColumnsType<PsychologyWorkloadM857> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '门诊数', dataIndex: 'outpatient', width: 100, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '心理评估数', dataIndex: 'assessment', width: 130, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  { title: '认知行为治疗数', dataIndex: 'cbt', width: 150, align: 'right', render: (v: number) => <Tag color="green">{v}</Tag> },
  { title: '团体心理治疗数', dataIndex: 'groupTherapy', width: 150, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
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

export default function PsychologyManagementM857Page() {
  usePageTitle('心理科管理');
  const { items, loading, error, demo, load } = usePsychologyWorkloadM857Store();
  const [detail, setDetail] = useState<PsychologyWorkloadM857 | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="心理科管理"
      description="日期 / 门诊数 / 心理评估数 / 认知行为治疗数 / 团体心理治疗数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`心理工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1400 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="心理工作详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="门诊数">{detail.outpatient}</Descriptions.Item>
              <Descriptions.Item label="心理评估数">{detail.assessment}</Descriptions.Item>
              <Descriptions.Item label="认知行为治疗数">{detail.cbt}</Descriptions.Item>
              <Descriptions.Item label="团体心理治疗数">{detail.groupTherapy}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="心理评估（SDS/SAS/PHQ-9/GAD-7）" span={2}>{detail.assessmentScores}</Descriptions.Item>
              <Descriptions.Item label="治疗记录" span={2}>{detail.treatmentRecords}</Descriptions.Item>
              <Descriptions.Item label="危机干预记录" span={2}>{detail.crisisIntervention}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="疾病谱分解（焦虑/抑郁/失眠/强迫）">
              <Table rowKey="name" dataSource={detail.diseaseBreakdown} columns={diseaseColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
