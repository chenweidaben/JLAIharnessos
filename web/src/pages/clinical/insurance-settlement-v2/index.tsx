/**
 * 健澜科技 jlmedaios - 医保结算看板（M635，配套 M608）
 *
 * 三甲流程：结算 Table（状态 badge：paid/partial/denied）+ 拒付原因统计卡 + 预授权列表。
 * 权限码 insurance:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect, useMemo } from 'react';
import {
  Alert,
  Card,
  Col,
  Row,
  Spin,
  Statistic,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { usePermission } from '@/router/guards';
import { useInsuranceSettlementV2M635Store } from '@/store/insuranceSettlementV2M635Store';
import {
  SETTLEMENT_STATUS_META,
  type Preauth,
  type Settlement,
} from '@/services/api/insuranceSettlementV2M635';

export default function InsuranceSettlementV2M635Page() {
  usePageTitle('医保结算看板');
  const { hasPermission } = usePermission();
  const canView = hasPermission('insurance:view');

  const { settlements, preauths, loading, error, demo, load } =
    useInsuranceSettlementV2M635Store();

  useEffect(() => {
    void load();
  }, [load]);

  const deniedList = useMemo(() => settlements.filter((s) => s.status === 'denied'), [settlements]);
  const partialCount = settlements.filter((s) => s.status === 'partial').length;
  const deniedCount = deniedList.length;
  const deniedAmount = deniedList.reduce((s, x) => s + x.billedAmount, 0);

  const columns: ColumnsType<Settlement> = [
    { title: '结算号', dataIndex: 'id', width: 100 },
    { title: '病例号', dataIndex: 'caseId', width: 100 },
    { title: '患者', dataIndex: 'patientId', width: 100 },
    { title: '申报(¥)', dataIndex: 'billedAmount', width: 110, render: (v: number) => v.toLocaleString() },
    { title: '实付(¥)', dataIndex: 'paidAmount', width: 110, render: (v: number) => v.toLocaleString() },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (v: Settlement['status']) => (
        <Tag color={SETTLEMENT_STATUS_META[v].color}>{SETTLEMENT_STATUS_META[v].label}</Tag>
      ),
    },
    { title: '拒付原因', dataIndex: 'deniedReason', ellipsis: true, render: (v: string | null) => v ?? '—' },
    { title: '结算时间', dataIndex: 'settledAt', width: 140, render: (v: string) => dayjs(v).format('MM-DD HH:mm') },
  ];

  const preauthColumns: ColumnsType<Preauth> = [
    { title: '预授权号', dataIndex: 'id', width: 100 },
    { title: '患者', dataIndex: 'patientId', width: 100 },
    { title: '项目', dataIndex: 'item' },
    { title: '核准金额(¥)', dataIndex: 'approvedAmount', width: 120, render: (v: number) => (v ? v.toLocaleString() : '—') },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (v: Preauth['status']) => (
        <Tag color={v === 'approved' ? 'green' : v === 'pending' ? 'orange' : 'red'}>
          {v === 'approved' ? '已核准' : v === 'pending' ? '待审核' : '驳回'}
        </Tag>
      ),
    },
  ];

  return (
    <PageContainer
      title="医保结算看板（v2）"
      description="结算状态 + 拒付原因统计 + 预授权"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}
      {!canView && (
        <Alert type="warning" showIcon style={{ marginBottom: 12 }} message="当前账号缺少 insurance:view 权限" />
      )}

      <Spin spinning={loading}>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Card size="small">
              <Statistic title="结算总数" value={settlements.length} />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small">
              <Statistic title="部分支付" value={partialCount} valueStyle={{ color: '#faad14' }} />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small">
              <Statistic title="拒付 / 拒付金额" value={deniedCount} suffix={`/ ¥${deniedAmount.toLocaleString()}`} valueStyle={{ color: '#cf1322' }} />
            </Card>
          </Col>
        </Row>

        <Card size="small" title="结算列表" style={{ marginBottom: 16 }}>
          <Table rowKey="id" dataSource={settlements} columns={columns} size="small" pagination={{ pageSize: 10 }} scroll={{ x: 900 }} />
        </Card>

        <Card size="small" title="预授权">
          <Table rowKey="id" dataSource={preauths} columns={preauthColumns} size="small" pagination={false} />
        </Card>
      </Spin>
    </PageContainer>
  );
}
