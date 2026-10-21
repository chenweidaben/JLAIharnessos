/**
 * 健澜科技 jlmedaios - 用药指导（M621，P12 患者侧深度）
 *
 * 三甲流程：用药清单 Table（药品/规格/用法/用量/途径/时间）+ 注意事项 Tag
 * + 用药时间轴（按 startDate 排序）。权限码 medication:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect } from 'react';
import {
  Alert,
  Card,
  Descriptions,
  Input,
  Space,
  Spin,
  Table,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { usePermission } from '@/router/guards';
import { useMedicationGuidanceM621Store } from '@/store/medicationGuidanceM621Store';
import type { MedicationGuidance } from '@/services/api/medicationGuidanceM621';

export default function MedicationGuidanceM621Page() {
  usePageTitle('用药指导');
  const { hasPermission } = usePermission();
  const canView = hasPermission('medication:view');

  const { patientId, items, loading, error, demo, load } = useMedicationGuidanceM621Store();

  useEffect(() => {
    void load(patientId);
  }, [load, patientId]);

  const columns: ColumnsType<MedicationGuidance> = [
    { title: '药品', dataIndex: 'drugName', width: 200 },
    { title: '规格', dataIndex: 'spec', width: 130 },
    { title: '单次剂量', dataIndex: 'dosage', width: 100 },
    { title: '频次', dataIndex: 'frequency', width: 110 },
    { title: '途径', dataIndex: 'route', width: 80 },
    { title: '用药时间', dataIndex: 'timing', width: 130 },
    {
      title: '注意事项',
      dataIndex: 'precautions',
      render: (list: string[]) => (
        <Space wrap>
          {list.map((p) => (
            <Tag key={p} color="orange">
              {p}
            </Tag>
          ))}
        </Space>
      ),
    },
  ];

  const timelineItems = [...items]
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .map((m) => ({
      color: m.endDate ? 'green' : 'blue',
      children: (
        <Space direction="vertical" size={0}>
          <Space>
            <b>{dayjs(m.startDate).format('YYYY-MM-DD')}</b>
            <span>开始</span>
            {m.endDate && <Tag color="green">至 {dayjs(m.endDate).format('YYYY-MM-DD')} 结束</Tag>}
          </Space>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {m.drugName} {m.dosage} · {m.frequency} · {m.timing}
          </Typography.Text>
        </Space>
      ),
    }));

  return (
    <PageContainer
      title="用药指导"
      description="当前用药清单（用法/用量/注意事项）+ 用药时间轴"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}
      {!canView && (
        <Alert type="warning" showIcon style={{ marginBottom: 12 }} message="当前账号缺少 medication:view 权限" />
      )}

      <Card size="small" style={{ marginBottom: 16 }}>
        <Input
          style={{ maxWidth: 360 }}
          addonBefore="患者"
          defaultValue={patientId}
          onPressEnter={(e) => void load((e.target as HTMLInputElement).value)}
        />
      </Card>

      <Card size="small" title={`用药清单（${items.length}）`} style={{ marginBottom: 16 }}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Card size="small" title="用药时间轴">
        <Timeline items={timelineItems} />
      </Card>

      <Card size="small" style={{ marginTop: 16 }}>
        <Descriptions column={1} size="small" title="通用提醒">
          <Descriptions.Item label="服用方式">遵医嘱按时按量服药，不可自行增减或停药。</Descriptions.Item>
          <Descriptions.Item label="漏服处理">想起时距下次服药时间过半，跳过漏服剂量，下次正常剂量，不可双倍。</Descriptions.Item>
        </Descriptions>
      </Card>
    </PageContainer>
  );
}
