/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 核心制度质控：十八项医疗质量安全核心制度执行检查
 */
import { useEffect } from 'react';
import {
  Alert,
  Card,
  Col,
  Descriptions,
  Progress,
  Row,
  Space,
  Statistic,
  Tag,
  Timeline,
} from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import type { CoreSystemItem, SystemExecStatus } from '@/types/quality';
import { useQualityStore } from '@/store/qualityStore';
import BaseChart from '@/components/charts/BaseChart';

const STATUS_META: Record<
  SystemExecStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  executed: {
    label: '已执行',
    color: 'success',
    icon: <CheckCircleOutlined className="text-success" />,
  },
  partial: {
    label: '部分执行',
    color: 'warning',
    icon: <ClockCircleOutlined className="text-warning" />,
  },
  not_executed: {
    label: '未执行',
    color: 'error',
    icon: <ExclamationCircleOutlined className="text-danger" />,
  },
};

function SystemCard({ item, index }: { item: CoreSystemItem; index: number }) {
  const meta = STATUS_META[item.status];
  return (
    <Card
      size="small"
      className="shadow-card"
      title={
        <Space size={6}>
          <span className="text-xs text-ink-secondary">{String(index + 1).padStart(2, '0')}</span>
          <span className="font-medium">{item.name}</span>
        </Space>
      }
      extra={
        <Tag color={meta.color} icon={meta.icon}>
          {meta.label}
        </Tag>
      }
    >
      <div className="mb-1 text-xs text-ink-secondary">检查要点</div>
      <ul className="mb-2 list-inside list-disc text-xs">
        {item.checkPoints.map((p, i) => (
          <li key={i}>{p}</li>
        ))}
      </ul>
      {item.execRecords.length > 0 ? (
        <Timeline
          className="mt-2"
          items={item.execRecords.map((r) => ({
            color: 'green',
            children: (
              <div className="text-xs">
                <div>
                  {r.time} · {r.personnel}
                </div>
                <div className="text-ink-secondary">{r.content}</div>
              </div>
            ),
          }))}
        />
      ) : (
        <Alert message="无执行记录" type="error" showIcon className="mb-2" />
      )}
      {item.issues.length > 0 && (
        <Alert
          className="mb-1"
          type={item.status === 'not_executed' ? 'error' : 'warning'}
          showIcon
          message={item.issues.join('；')}
        />
      )}
      <div className="text-xs text-jl-primary">整改建议：{item.suggestion}</div>
    </Card>
  );
}

export default function CoreSystemCheck() {
  const { coreSystemResult, fetchCoreSystem, loading } = useQualityStore();

  useEffect(() => {
    void fetchCoreSystem();
  }, [fetchCoreSystem]);

  const items = coreSystemResult?.items ?? [];
  const executed = items.filter((i) => i.status === 'executed').length;
  const partial = items.filter((i) => i.status === 'partial').length;

  return (
    <div className="space-y-3">
      {/* 概览 */}
      <Card className="shadow-card" loading={loading}>
        <Row gutter={16}>
          <Col xs={24} md={6}>
            <Statistic title="检查病历" value={coreSystemResult?.recordNo ?? '--'} />
          </Col>
          <Col xs={24} md={6}>
            <Statistic
              title="制度执行率"
              value={coreSystemResult?.execRate ?? 0}
              suffix="%"
              valueStyle={{ color: '#0A4D8C' }}
            />
          </Col>
          <Col xs={24} md={6}>
            <Statistic title="已执行 / 部分执行" value={`${executed} / ${partial}`} suffix="项" />
          </Col>
          <Col xs={24} md={6}>
            <div className="text-xs text-ink-secondary">执行率进度</div>
            <Progress
              percent={coreSystemResult?.execRate ?? 0}
              strokeColor="#0A4D8C"
              status={coreSystemResult && coreSystemResult.execRate < 80 ? 'exception' : 'active'}
            />
          </Col>
        </Row>
        {coreSystemResult?.warningSystems && coreSystemResult.warningSystems.length > 0 && (
          <Alert
            className="mt-3"
            type="warning"
            showIcon
            message={`未执行制度预警：${coreSystemResult.warningSystems.join('、')}，请科室限期整改。`}
          />
        )}
      </Card>

      {/* 制度执行趋势 */}
      <Card size="small" title="制度执行率趋势（近6个月）" className="shadow-card">
        <BaseChart
          height={240}
          option={{
            tooltip: { trigger: 'axis' },
            legend: { data: ['执行率'] },
            xAxis: {
              type: 'category',
              data: ['4月', '5月', '6月', '7月', '8月', '9月'],
            },
            yAxis: { type: 'value', min: 60, max: 100, axisLabel: { formatter: '{value}%' } },
            series: [
              {
                name: '执行率',
                type: 'line',
                smooth: true,
                data: [72, 76, 79, 81, 82, coreSystemResult?.execRate ?? 83],
                areaStyle: { opacity: 0.15 },
              },
            ],
          }}
        />
      </Card>

      {/* 十八项制度 */}
      <Descriptions size="small" className="text-xs" column={1}>
        <Descriptions.Item label="说明">
          以下为十八项医疗质量安全核心制度执行情况，依据《医疗质量管理办法》逐项自动核查病历留痕。
        </Descriptions.Item>
      </Descriptions>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item, idx) => (
          <SystemCard key={item.key} item={item} index={idx} />
        ))}
      </div>
    </div>
  );
}
