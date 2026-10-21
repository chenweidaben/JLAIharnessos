/**
 * 健澜科技 jlmedaios - 报告推送（M617，P11 智慧服务）
 *
 * 三甲流程：报告列表 Table（状态 badge：delivered/read/acknowledged）
 * → 行内「查看」Drawer 展示报告摘要 + 推送/阅读/确认时间。权限码 report:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Drawer,
  Input,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { usePermission } from '@/router/guards';
import { useReportDeliveryM617Store } from '@/store/reportDeliveryM617Store';
import {
  DELIVERY_STATUS_META,
  type ReportDelivery,
} from '@/services/api/reportDeliveryM617';

export default function ReportDeliveryM617Page() {
  usePageTitle('报告推送');
  const { hasPermission } = usePermission();
  const canView = hasPermission('report:view');

  const { patientId, items, loading, error, demo, load } = useReportDeliveryM617Store();
  const [active, setActive] = useState<ReportDelivery | null>(null);

  useEffect(() => {
    void load(patientId);
  }, [load, patientId]);

  const columns: ColumnsType<ReportDelivery> = [
    { title: '报告号', dataIndex: 'reportNo', width: 180 },
    { title: '类型', dataIndex: 'reportType', width: 120 },
    { title: '科室', dataIndex: 'deptCode', width: 100 },
    { title: '推送时间', dataIndex: 'deliveredAt', width: 160, render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm') },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (v: ReportDelivery['status']) => (
        <Tag color={DELIVERY_STATUS_META[v].color}>{DELIVERY_STATUS_META[v].label}</Tag>
      ),
    },
    {
      title: '操作',
      width: 90,
      render: (_: unknown, r) => (
        <Button size="small" type="link" onClick={() => setActive(r)}>
          查看
        </Button>
      ),
    },
  ];

  return (
    <PageContainer
      title="报告推送"
      description="患者侧报告送达状态追踪（已推送/已读/已确认）"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}
      {!canView && (
        <Alert type="warning" showIcon style={{ marginBottom: 12 }} message="当前账号缺少 report:view 权限" />
      )}

      <Card size="small" style={{ marginBottom: 16 }}>
        <Input
          style={{ maxWidth: 360 }}
          addonBefore="患者"
          defaultValue={patientId}
          onPressEnter={(e) => void load((e.target as HTMLInputElement).value)}
        />
      </Card>

      <Card size="small" title={`报告列表（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} />
        </Spin>
      </Card>

      <Drawer
        open={active != null}
        title={active ? `报告 ${active.reportNo}` : '报告详情'}
        width={520}
        onClose={() => setActive(null)}
      >
        {active && (
          <>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="类型">{active.reportType}</Descriptions.Item>
              <Descriptions.Item label="出报告科室">{active.deptCode}</Descriptions.Item>
              <Descriptions.Item label="推送时间">{dayjs(active.deliveredAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
              <Descriptions.Item label="阅读时间">
                {active.readAt ? dayjs(active.readAt).format('YYYY-MM-DD HH:mm') : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="确认时间">
                {active.acknowledgedAt ? dayjs(active.acknowledgedAt).format('YYYY-MM-DD HH:mm') : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={DELIVERY_STATUS_META[active.status].color}>
                  {DELIVERY_STATUS_META[active.status].label}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
            <Typography.Paragraph style={{ marginTop: 16 }}>
              <b>报告摘要：</b>
              {active.summary}
            </Typography.Paragraph>
          </>
        )}
      </Drawer>
    </PageContainer>
  );
}
