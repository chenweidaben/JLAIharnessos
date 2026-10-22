/**
 * 健澜科技 jlmedaios - 中医科管理（M776）
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
import { useTcmPatientM776Store } from '@/store/tcmPatientM776Store';
import type { TcmPatient } from '@/services/api/tcmPatientM776';

const rxColumns: ColumnsType<{ date: string; formula: string; herbs: string }> = [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '方剂', dataIndex: 'formula', width: 180 },
  { title: '组成', dataIndex: 'herbs' },
];

const acuColumns: ColumnsType<{ date: string; therapy: string; acupoints: string }> = [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '疗法', dataIndex: 'therapy', width: 160 },
  { title: '穴位', dataIndex: 'acupoints' },
];

const buildColumns = (setDetail: (r: TcmPatient) => void): ColumnsType<TcmPatient> => [
  { title: '住院号', dataIndex: 'inpatientNo', width: 130 },
  { title: '患者姓名', dataIndex: 'patient', width: 110 },
  { title: '中医诊断', dataIndex: 'tcmDiagnosis', width: 140 },
  { title: '证型', dataIndex: 'syndrome', width: 160, ellipsis: true },
  { title: '治则治法', dataIndex: 'principle', width: 220, ellipsis: true },
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

export default function TcmM776Page() {
  usePageTitle('中医科管理');
  const { items, loading, error, demo, load } = useTcmPatientM776Store();
  const [detail, setDetail] = useState<TcmPatient | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="中医科管理"
      description="住院号 / 患者姓名 / 中医诊断 / 证型 / 治则治法 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`中医患者（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1200 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="中医患者详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="住院号">{detail.inpatientNo}</Descriptions.Item>
              <Descriptions.Item label="患者姓名">{detail.patient}</Descriptions.Item>
              <Descriptions.Item label="中医诊断">{detail.tcmDiagnosis}</Descriptions.Item>
              <Descriptions.Item label="证型">{detail.syndrome}</Descriptions.Item>
              <Descriptions.Item label="治则治法" span={2}>{detail.principle}</Descriptions.Item>
              <Descriptions.Item label="四诊摘要" span={2}>{detail.fourExams}</Descriptions.Item>
              <Descriptions.Item label="辨证论治" span={2}>{detail.treatment}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="处方记录" style={{ marginBottom: 16 }}>
              <Table rowKey="date" dataSource={detail.prescriptions} columns={rxColumns} size="small" pagination={false} />
            </Card>
            <Card size="small" title="针灸推拿记录">
              <Table rowKey="date" dataSource={detail.acuRecords} columns={acuColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
