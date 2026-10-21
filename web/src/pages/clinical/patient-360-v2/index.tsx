/**
 * 健澜科技 jlmedaios - 患者 360 视图 v2（M630，P0 合规）
 *
 * 三甲流程：Descriptions 基本信息 + 近期就诊 Timeline + 用药 Table + 检验摘要（异常红/橙 Tag）。
 * 权限码 patient:view360。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect } from 'react';
import {
  Alert,
  Card,
  Col,
  Descriptions,
  Input,
  Row,
  Spin,
  Table,
  Tag,
  Timeline,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { usePermission } from '@/router/guards';
import { usePatient360V2M630Store } from '@/store/patient360V2M630Store';

interface MedRow {
  drugName: string;
  dosage: string;
  startDate: string;
}

interface LabRow {
  itemName: string;
  value: string;
  refRange: string;
  abnormal: 'high' | 'low' | 'normal';
}

export default function Patient360V2M630Page() {
  usePageTitle('患者 360 视图');
  const { hasPermission } = usePermission();
  const canView = hasPermission('patient:view360');

  const { patientId, summary, loading, error, demo, load } = usePatient360V2M630Store();

  useEffect(() => {
    void load(patientId);
  }, [load, patientId]);

  const medColumns: ColumnsType<MedRow> = [
    { title: '药品', dataIndex: 'drugName' },
    { title: '用法', dataIndex: 'dosage', width: 140 },
    { title: '起始日期', dataIndex: 'startDate', width: 130, render: (v: string) => dayjs(v).format('YYYY-MM-DD') },
  ];

  const labColumns: ColumnsType<LabRow> = [
    { title: '项目', dataIndex: 'itemName' },
    { title: '结果', dataIndex: 'value', width: 110 },
    { title: '参考区间', dataIndex: 'refRange', width: 140 },
    {
      title: '状态',
      dataIndex: 'abnormal',
      width: 100,
      render: (v: LabRow['abnormal']) =>
        v === 'normal' ? <Tag color="green">正常</Tag> : <Tag color={v === 'high' ? 'red' : 'orange'}>{v === 'high' ? '偏高' : '偏低'}</Tag>,
    },
  ];

  return (
    <PageContainer
      title="患者 360 视图（v2）"
      description="基本信息 + 近期就诊 + 用药 + 检验聚合"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}
      {!canView && (
        <Alert type="warning" showIcon style={{ marginBottom: 12 }} message="当前账号缺少 patient:view360 权限" />
      )}

      <Card size="small" style={{ marginBottom: 16 }}>
        <Input
          style={{ maxWidth: 360 }}
          addonBefore="患者"
          defaultValue={patientId}
          onPressEnter={(e) => void load((e.target as HTMLInputElement).value)}
        />
      </Card>

      <Spin spinning={loading}>
        <Card size="small" title="基本信息" style={{ marginBottom: 16 }}>
          <Descriptions column={4} size="small" bordered>
            <Descriptions.Item label="姓名">{summary?.basic.name ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="性别">{summary?.basic.gender ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="年龄">{summary?.basic.age ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="血型">{summary?.basic.bloodType ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="联系电话" span={2}>{summary?.basic.phone ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="患者 ID" span={2}>{summary?.basic.patientId ?? '—'}</Descriptions.Item>
          </Descriptions>
        </Card>

        <Row gutter={16}>
          <Col span={10}>
            <Card size="small" title="近期就诊">
              <Timeline
                items={(summary?.recentVisits ?? []).map((v) => ({
                  color: 'blue',
                  children: (
                    <>
                      <b>{v.deptName}</b>
                      <span style={{ marginLeft: 8, color: '#888', fontSize: 12 }}>
                        {dayjs(v.date).format('YYYY-MM-DD')}
                      </span>
                      <div style={{ fontSize: 12, marginTop: 4 }}>{v.diagnosis}</div>
                    </>
                  ),
                }))}
              />
            </Card>
          </Col>
          <Col span={14}>
            <Card size="small" title="当前用药" style={{ marginBottom: 16 }}>
              <Table rowKey="drugName" dataSource={summary?.medications ?? []} columns={medColumns} size="small" pagination={false} />
            </Card>
            <Card size="small" title="检验摘要">
              <Table rowKey="itemName" dataSource={summary?.labs ?? []} columns={labColumns} size="small" pagination={false} />
            </Card>
          </Col>
        </Row>
      </Spin>
    </PageContainer>
  );
}
