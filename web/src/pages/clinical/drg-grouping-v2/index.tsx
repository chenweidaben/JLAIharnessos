/**
 * 健澜科技 jlmedaios - DRG 分组看板（M634，配套 M607）
 *
 * 三甲流程：病例 Table（DRG 组/费用/权重/盈亏状态）+ DRG 组目录 Card
 * + 超支/结余统计卡。权限码 drg:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect } from 'react';
import {
  Alert,
  Card,
  Col,
  Descriptions,
  List,
  Row,
  Spin,
  Statistic,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { usePermission } from '@/router/guards';
import { useDrgGroupingV2M634Store } from '@/store/drgGroupingV2M634Store';
import {
  DRG_PNL_META,
  type DrgCase,
  type DrgGroup,
} from '@/services/api/drgGroupingV2M634';

export default function DrgGroupingV2M634Page() {
  usePageTitle('DRG 分组看板');
  const { hasPermission } = usePermission();
  const canView = hasPermission('drg:view');

  const { cases, groups, loading, error, demo, load } = useDrgGroupingV2M634Store();

  useEffect(() => {
    void load();
  }, [load]);

  const overCount = cases.filter((c) => c.pnlStatus === 'over').length;
  const underCount = cases.filter((c) => c.pnlStatus === 'under').length;
  const overAmount = cases.filter((c) => c.pnlStatus === 'over').reduce((s, c) => s + c.pnlAmount, 0);
  const underAmount = cases.filter((c) => c.pnlStatus === 'under').reduce((s, c) => s + c.pnlAmount, 0);

  const caseColumns: ColumnsType<DrgCase> = [
    { title: '病例号', dataIndex: 'caseId', width: 100 },
    { title: '患者', dataIndex: 'patientId', width: 100 },
    { title: '科室', dataIndex: 'deptName', width: 120 },
    { title: 'DRG 组', dataIndex: 'drgCode', width: 100 },
    { title: '总费用(¥)', dataIndex: 'totalCost', width: 110, render: (v: number) => v.toLocaleString() },
    { title: '权重', dataIndex: 'weight', width: 80 },
    {
      title: '盈亏状态',
      dataIndex: 'pnlStatus',
      width: 110,
      render: (v: DrgCase['pnlStatus']) => <Tag color={DRG_PNL_META[v].color}>{DRG_PNL_META[v].label}</Tag>,
    },
    {
      title: '盈亏额(¥)',
      dataIndex: 'pnlAmount',
      width: 120,
      render: (v: number) => (
        <span style={{ color: v < 0 ? '#cf1322' : v > 0 ? '#3f8600' : '#666' }}>
          {v > 0 ? `+${v.toLocaleString()}` : v.toLocaleString()}
        </span>
      ),
    },
  ];

  return (
    <PageContainer
      title="DRG 分组看板（v2）"
      description="病例盈亏 + DRG 组目录 + 超支结余统计"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}
      {!canView && (
        <Alert type="warning" showIcon style={{ marginBottom: 12 }} message="当前账号缺少 drg:view 权限" />
      )}

      <Spin spinning={loading}>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card size="small">
              <Statistic title="超支病例" value={overCount} valueStyle={{ color: '#cf1322' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="超支金额(¥)" value={overAmount} valueStyle={{ color: '#cf1322' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="结余病例" value={underCount} valueStyle={{ color: '#3f8600' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="结余金额(¥)" value={underAmount} valueStyle={{ color: '#3f8600' }} />
            </Card>
          </Col>
        </Row>

        <Card size="small" title="病例盈亏列表" style={{ marginBottom: 16 }}>
          <Table rowKey="caseId" dataSource={cases} columns={caseColumns} size="small" pagination={false} scroll={{ x: 900 }} />
        </Card>

        <Card size="small" title="DRG 组目录">
          <List
            grid={{ gutter: 16, column: 3 }}
            dataSource={groups}
            renderItem={(g: DrgGroup) => (
              <List.Item>
                <Descriptions column={1} size="small" bordered title={<Tag color="blue">{g.code}</Tag>}>
                  <Descriptions.Item label="名称">{g.name}</Descriptions.Item>
                  <Descriptions.Item label="例数">{g.caseCount}</Descriptions.Item>
                  <Descriptions.Item label="例均费用">¥{g.avgCost.toLocaleString()}</Descriptions.Item>
                  <Descriptions.Item label="平均权重">{g.avgWeight}</Descriptions.Item>
                </Descriptions>
              </List.Item>
            )}
          />
        </Card>
      </Spin>
    </PageContainer>
  );
}
