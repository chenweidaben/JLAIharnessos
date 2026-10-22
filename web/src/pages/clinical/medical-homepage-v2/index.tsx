/**
 * 健澜科技 jlmedaios - 病案首页（M671，配套 M567）
 *
 * 三甲流程：首页 Table（住院号/入出院日期/主要诊断/手术/总费用）+ 详情 Descriptions Modal。
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
  Space,
  Spin,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { useMedicalHomepageV2M671Store } from '@/store/medicalHomepageV2M671Store';
import type { MedicalHomepage } from '@/services/api/medicalHomepageV2M671';

const yuan = (v: number) => `¥${v.toLocaleString('zh-CN')}`;

const buildColumns = (setDetail: (row: MedicalHomepage) => void): ColumnsType<MedicalHomepage> => [
  { title: '住院号', dataIndex: 'inpatientNo', width: 110 },
  { title: '患者', dataIndex: 'patientId', width: 100 },
  { title: '入院日期', dataIndex: 'admissionDate', width: 110 },
  { title: '出院日期', dataIndex: 'dischargeDate', width: 110 },
  { title: '主要诊断', dataIndex: 'primaryDiagnosis', ellipsis: true },
  { title: '手术操作', dataIndex: 'surgeryProcedures', ellipsis: true, render: (arr: string[]) => arr.join('；') },
  { title: '病理诊断', dataIndex: 'pathologyDiagnosis', ellipsis: true, render: (v: string) => v || '—' },
  { title: '总费用', dataIndex: 'totalCost', width: 120, align: 'right', render: (v: number) => yuan(v) },
  {
    title: '操作',
    dataIndex: 'id',
    width: 90,
    render: (_v, row) => (
      <Button type="link" size="small" onClick={() => setDetail(row)}>
        详情
      </Button>
    ),
  },
];

export default function MedicalHomepageV2M671Page() {
  usePageTitle('病案首页');

  const { items, loading, error, demo, load } = useMedicalHomepageV2M671Store();

  const [detail, setDetail] = useState<MedicalHomepage | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="病案首页（v2）"
      description="住院号 / 主要诊断 / 手术 / 病理 / 费用"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`病案首页（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={{ pageSize: 10 }} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="病案首页详情"
        width={780}
        footer={
          <Space>
            <Button onClick={() => setDetail(null)}>关闭</Button>
          </Space>
        }
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="住院号">{detail.inpatientNo}</Descriptions.Item>
            <Descriptions.Item label="患者 ID">{detail.patientId}</Descriptions.Item>
            <Descriptions.Item label="入院日期">{detail.admissionDate}</Descriptions.Item>
            <Descriptions.Item label="出院日期">{detail.dischargeDate}</Descriptions.Item>
            <Descriptions.Item label="主要诊断">{detail.primaryDiagnosis}</Descriptions.Item>
            <Descriptions.Item label="其他诊断">
              {detail.secondaryDiagnoses.map((d) => (
                <Tag key={d} style={{ marginBottom: 4 }}>{d}</Tag>
              ))}
            </Descriptions.Item>
            <Descriptions.Item label="手术与操作">
              {detail.surgeryProcedures.map((s) => (
                <div key={s}>· {s}</div>
              ))}
            </Descriptions.Item>
            <Descriptions.Item label="病理诊断">{detail.pathologyDiagnosis || '—'}</Descriptions.Item>
            <Descriptions.Item label="总费用">{yuan(detail.totalCost)}</Descriptions.Item>
            <Descriptions.Item label="医保支付">{yuan(detail.insurancePay)}</Descriptions.Item>
            <Descriptions.Item label="个人自付">{yuan(detail.selfPay)}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  );
}
