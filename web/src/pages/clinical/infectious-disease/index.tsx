/**
 * 健澜科技 jlmedaios - 感染科管理（M791）
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
import { useIdPatientM791Store } from '@/store/idPatientM791Store';
import type { IdPatient } from '@/services/api/idPatientM791';

const buildColumns = (setDetail: (r: IdPatient) => void): ColumnsType<IdPatient> => [
  { title: '住院号', dataIndex: 'inpatientNo', width: 130 },
  { title: '患者姓名', dataIndex: 'patient', width: 110 },
  { title: '诊断', dataIndex: 'diagnosis', width: 220, ellipsis: true },
  { title: '感染部位', dataIndex: 'site', width: 110 },
  { title: '病原菌', dataIndex: 'pathogen', width: 220, ellipsis: true },
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

export default function InfectiousDiseaseM791Page() {
  usePageTitle('感染科管理');
  const { items, loading, error, demo, load } = useIdPatientM791Store();
  const [detail, setDetail] = useState<IdPatient | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="感染科管理"
      description="住院号 / 患者姓名 / 诊断 / 感染部位 / 病原菌 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`感染患者（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1200 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="感染患者详情"
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
              <Descriptions.Item label="感染部位">{detail.site}</Descriptions.Item>
              <Descriptions.Item label="病原菌">{detail.pathogen}</Descriptions.Item>
              <Descriptions.Item label="微生物培养" span={2}>{detail.culture}</Descriptions.Item>
              <Descriptions.Item label="药敏试验" span={2}>{detail.susceptibility}</Descriptions.Item>
              <Descriptions.Item label="抗感染方案" span={2}>{detail.regimen}</Descriptions.Item>
              <Descriptions.Item label="疗效评估" span={2}>{detail.efficacy}</Descriptions.Item>
              <Descriptions.Item label="隔离措施" span={2}>{detail.isolation}</Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
