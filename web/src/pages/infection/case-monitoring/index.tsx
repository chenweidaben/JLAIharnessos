/**
 * 健澜科技 jlmedaios - 院感病例监测（M703）
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
import { useInfectionCaseM703Store } from '@/store/infectionCaseM703Store';
import {
  REPORT_STATUS_META,
  type InfectionCase,
} from '@/services/api/infectionCaseM703';

const buildColumns = (setDetail: (r: InfectionCase) => void): ColumnsType<InfectionCase> => [
  { title: '病例号', dataIndex: 'caseNo', width: 130 },
  { title: '患者', dataIndex: 'patientId', width: 100 },
  { title: '感染部位', dataIndex: 'site', ellipsis: true },
  { title: '诊断日期', dataIndex: 'diagnosedAt', width: 110 },
  {
    title: '上报状态',
    dataIndex: 'status',
    width: 110,
    render: (v: InfectionCase['status']) => <Tag color={REPORT_STATUS_META[v].color}>{REPORT_STATUS_META[v].label}</Tag>,
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

export default function InfectionCaseM703Page() {
  usePageTitle('院感病例监测');
  const { items, loading, error, demo, load } = useInfectionCaseM703Store();
  const [detail, setDetail] = useState<InfectionCase | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="院感病例监测"
      description="病例号 / 患者 / 感染部位 / 诊断日期 / 上报状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`院感病例（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 900 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="院感病例详情"
        width={680}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="病例号">{detail.caseNo}</Descriptions.Item>
            <Descriptions.Item label="患者 ID">{detail.patientId}</Descriptions.Item>
            <Descriptions.Item label="感染部位">{detail.site}</Descriptions.Item>
            <Descriptions.Item label="诊断日期">{detail.diagnosedAt}</Descriptions.Item>
            <Descriptions.Item label="病原菌">{detail.pathogen}</Descriptions.Item>
            <Descriptions.Item label="抗菌药物使用">{detail.antibiotics}</Descriptions.Item>
            <Descriptions.Item label="院感转归">{detail.outcome}</Descriptions.Item>
            <Descriptions.Item label="上报状态">
              <Tag color={REPORT_STATUS_META[detail.status].color}>{REPORT_STATUS_META[detail.status].label}</Tag>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  );
}
