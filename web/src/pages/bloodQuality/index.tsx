/**
 * 健澜科技 jlmedaios - 临床用血质量工作站（M10-B）
 *
 * 输血疗效评估 + 用血合理性评价 + 等级评审质控指标。
 * 真实 BFF + 真实 PG。健康门禁：BFF/DB 不可用时显式 Alert + Watermark，阻断写操作。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  DatePicker,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Layout,
  Space,
  Spin,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
  Watermark,
} from 'antd';
import { SafetyCertificateOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { useBloodQualityStore } from '@/store/bloodQualityStore';
import type { EfficacyGrade, UtilizationConclusion } from '@/types/bloodQuality';

const { Header, Content } = Layout;
const { RangePicker } = DatePicker;
const watermarkText = ['健澜科技', '用血质量', 'jlmedaios'];

const GRADE_COLOR: Record<EfficacyGrade, string> = {
  effective: 'green',
  partial: 'gold',
  ineffective: 'red',
  indeterminate: 'default',
};
const GRADE_LABEL: Record<EfficacyGrade, string> = {
  effective: '显效',
  partial: '部分有效',
  ineffective: '无效',
  indeterminate: '无法判定',
};
const CONCLUSION_COLOR: Record<UtilizationConclusion, string> = {
  rational: 'green',
  largely: 'gold',
  irrational: 'red',
};
const CONCLUSION_LABEL: Record<UtilizationConclusion, string> = {
  rational: '合理',
  largely: '基本合理',
  irrational: '不合理',
};

const METRIC_GOALS: Record<string, { label: number; goal: number; higher: boolean }> = {
  componentTransfusionRate: { label: 0, goal: 95, higher: true },
  indicationPassRate: { label: 0, goal: 90, higher: true },
  preTestRate: { label: 0, goal: 100, higher: true },
  reactionRate: { label: 0, goal: 0, higher: false },
  efficacyAssessmentRate: { label: 0, goal: 0, higher: true },
  inpatientTransfusionRate: { label: 0, goal: 0, higher: true },
};

// ---------------------------------------------------------------------------
// Tab 1：质控指标看板
// ---------------------------------------------------------------------------
function MetricsTab() {
  const { metrics, loadMetrics } = useBloodQualityStore();
  const [range, setRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('month'),
    dayjs(),
  ]);

  const onLoad = () => {
    void loadMetrics(range[0].toISOString(), range[1].toISOString());
  };

  const m = metrics?.metrics;
  const metricCards: { key: string; title: string; value: number; suffix: string }[] = [
    { key: 'componentTransfusionRate', title: '成分输血率', value: m?.componentTransfusionRate ?? 0, suffix: '%' },
    { key: 'indicationPassRate', title: '输血指征合格率', value: m?.indicationPassRate ?? 0, suffix: '%' },
    { key: 'preTestRate', title: '输血前检测率', value: m?.preTestRate ?? 0, suffix: '%' },
    { key: 'reactionRate', title: '输血不良反应率', value: m?.reactionRate ?? 0, suffix: '%' },
    { key: 'efficacyAssessmentRate', title: '疗效评估率', value: m?.efficacyAssessmentRate ?? 0, suffix: '%' },
    { key: 'inpatientTransfusionRate', title: '住院输血率', value: m?.inpatientTransfusionRate ?? 0, suffix: '%' },
  ];

  return (
    <Space direction="vertical" className="w-full" size="middle">
      <Card size="small">
        <Space wrap>
          <RangePicker
            showTime
            value={range}
            onChange={(v) => v && v[0] && v[1] && setRange([v[0], v[1]])}
          />
          <Button type="primary" onClick={onLoad}>
            加载质控指标
          </Button>
          {metrics && (
            <Typography.Text type="secondary">
              周期内申请 {metrics.totalRequests} 次 · 出院 {metrics.inpatientDischarges} 人
            </Typography.Text>
          )}
        </Space>
      </Card>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {metricCards.map((c) => {
          const goal = METRIC_GOALS[c.key];
          const ok = goal.higher ? c.value >= goal.goal : c.value <= goal.goal;
          return (
            <Card key={c.key} size="small">
              <Statistic
                title={c.title}
                value={c.value}
                precision={2}
                suffix={c.suffix}
                valueStyle={{ color: goal.goal === 0 ? '#1677ff' : ok ? '#3f8600' : '#cf1322' }}
              />
              {goal.goal > 0 && (
                <Tag color={ok ? 'green' : 'red'} className="mt-1">
                  目标 {goal.goal}{c.suffix} {ok ? '达标' : '未达标'}
                </Tag>
              )}
            </Card>
          );
        })}
      </div>
      {m && (
        <Card size="small" title="分子/分母（可核查）">
          <Table
            size="small"
            pagination={false}
            rowKey="key"
            dataSource={Object.entries(m.fractions).map(([key, f]) => ({
              key,
              name: metricCards.find((c) => c.key === key)?.title ?? key,
              numerator: f.numerator,
              denominator: f.denominator,
            }))}
            columns={[
              { title: '指标', dataIndex: 'name' },
              { title: '分子', dataIndex: 'numerator' },
              { title: '分母', dataIndex: 'denominator' },
            ]}
          />
        </Card>
      )}
    </Space>
  );
}

// ---------------------------------------------------------------------------
// 详情加载（疗效/合理性共用）
// ---------------------------------------------------------------------------
function DetailLoader({ requestId, setRequestId }: {
  requestId: string;
  setRequestId: (v: string) => void;
}) {
  const { loadDetail, detail } = useBloodQualityStore();
  return (
    <Card size="small" title="用血详情">
      <Space className="w-full">
        <Input
          placeholder="输入输血申请 UUID"
          value={requestId}
          onChange={(e) => setRequestId(e.target.value)}
          style={{ width: 360 }}
        />
        <Button onClick={() => void loadDetail(requestId)}>加载详情</Button>
      </Space>
      {detail && (
        <Descriptions size="small" column={2} bordered className="mt-3">
          <Descriptions.Item label="成分">
            {String(detail.req.component ?? '')}
          </Descriptions.Item>
          <Descriptions.Item label="剂量">
            {String(detail.req.unit_count ?? '')} U
          </Descriptions.Item>
          <Descriptions.Item label="输注状态">
            {detail.transfusion ? String(detail.transfusion.status ?? '') : '无输注'}
          </Descriptions.Item>
          <Descriptions.Item label="紧急度">
            {String(detail.req.urgency ?? '')}
          </Descriptions.Item>
        </Descriptions>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Tab 2：疗效评估
// ---------------------------------------------------------------------------
function EfficacyTab() {
  const [requestId, setRequestId] = useState('');
  const [manualPre, setManualPre] = useState<number | null>(null);
  const [manualPost, setManualPost] = useState<number | null>(null);
  const [windowHours, setWindowHours] = useState(72);
  const { assess, efficacyList, detail } = useBloodQualityStore();

  const onAssess = () => {
    void assess({
      requestId,
      manualPre: manualPre ?? undefined,
      manualPost: manualPost ?? undefined,
      windowHours,
    });
  };

  return (
    <Space direction="vertical" className="w-full" size="middle">
      <DetailLoader requestId={requestId} setRequestId={setRequestId} />
      <Card size="small" title="疗效评估（默认自动匹配输注前后指标，可手动录入）">
        <Space wrap>
          <span>输注前指标：</span>
          <InputNumber
            placeholder="手动值"
            value={manualPre}
            onChange={(v) => setManualPre(v)}
            style={{ width: 120 }}
          />
          <span>输注后指标：</span>
          <InputNumber
            placeholder="手动值"
            value={manualPost}
            onChange={(v) => setManualPost(v)}
            style={{ width: 120 }}
          />
          <span>复查窗口(h)：</span>
          <InputNumber value={windowHours} onChange={(v) => setWindowHours(v ?? 72)} style={{ width: 100 }} />
          <Button type="primary" onClick={onAssess}>
            评估疗效
          </Button>
        </Space>
        {detail?.efficacy && (
          <Alert
            className="mt-3"
            type={detail.efficacy.efficacyGrade === 'effective' ? 'success' : detail.efficacy.efficacyGrade === 'ineffective' ? 'error' : 'warning'}
            showIcon
            message={
              <Space>
                <Tag color={GRADE_COLOR[detail.efficacy.efficacyGrade]}>
                  {GRADE_LABEL[detail.efficacy.efficacyGrade]}
                </Tag>
                {detail.efficacy.note}
              </Space>
            }
          />
        )}
      </Card>
      <Card size="small" title="疗效评估记录">
        <Table
          size="small"
          rowKey="id"
          dataSource={efficacyList}
          pagination={{ pageSize: 8 }}
          columns={[
            {
              title: '分级',
              dataIndex: 'efficacyGrade',
              render: (g: EfficacyGrade) => (
                <Tag color={GRADE_COLOR[g]}>{GRADE_LABEL[g]}</Tag>
              ),
            },
            { title: '成分', dataIndex: 'component' },
            { title: '输注前', dataIndex: 'preMetric' },
            { title: '输注后', dataIndex: 'postMetric' },
            { title: '实际变化', dataIndex: 'actualDelta' },
            { title: '评估时间', dataIndex: 'assessedAt', render: (v: string) => (v ? dayjs(v).format('MM-DD HH:mm') : '-') },
          ]}
        />
      </Card>
    </Space>
  );
}

// ---------------------------------------------------------------------------
// Tab 3：合理性评价
// ---------------------------------------------------------------------------
function UtilizationTab() {
  const [requestId, setRequestId] = useState('');
  const [form] = Form.useForm();
  const { review, utilizationList, detail } = useBloodQualityStore();

  const onReview = async () => {
    const values = await form.validateFields();
    void review({
      requestId,
      manualIndication: values.manualIndication ?? false,
      conclusionNote: values.conclusionNote,
    });
  };

  return (
    <Space direction="vertical" className="w-full" size="middle">
      <DetailLoader requestId={requestId} setRequestId={setRequestId} />
      <Card size="small" title="用血合理性评价">
        <Form form={form} layout="vertical">
          <Form.Item name="manualIndication" valuePropName="checked" label="人工确认指征（急诊抢救等未留检验，须在备注说明依据）">
            <Checkbox>人工确认指征（须在备注说明依据）</Checkbox>
          </Form.Item>
          <Form.Item name="conclusionNote" label="评价备注">
            <Input.TextArea rows={2} placeholder="补充临床依据或整改要求" />
          </Form.Item>
          <Button type="primary" onClick={() => void onReview()}>
            提交合理性评价
          </Button>
        </Form>
        {detail?.utilization && (
          <Alert
            className="mt-3"
            type={detail.utilization.conclusion === 'rational' ? 'success' : detail.utilization.conclusion === 'irrational' ? 'error' : 'warning'}
            showIcon
            message={
              <Space direction="vertical">
                <Tag color={CONCLUSION_COLOR[detail.utilization.conclusion]}>
                  {CONCLUSION_LABEL[detail.utilization.conclusion]}
                </Tag>
                {detail.utilization.issues.length > 0 && (
                  <Typography.Text>{detail.utilization.issues.join('；')}</Typography.Text>
                )}
              </Space>
            }
          />
        )}
      </Card>
      <Card size="small" title="用血合理性评价记录">
        <Table
          size="small"
          rowKey="id"
          dataSource={utilizationList}
          pagination={{ pageSize: 8 }}
          columns={[
            {
              title: '结论',
              dataIndex: 'conclusion',
              render: (c: UtilizationConclusion) => (
                <Tag color={CONCLUSION_COLOR[c]}>{CONCLUSION_LABEL[c]}</Tag>
              ),
            },
            { title: '指征合规', dataIndex: 'indicationCompliant', render: (v: boolean) => (v ? '是' : '否') },
            { title: '剂量合理', dataIndex: 'dosageCompliant', render: (v: boolean) => (v ? '是' : '否') },
            { title: '输血前检测完整', dataIndex: 'preTestComplete', render: (v: boolean) => (v ? '是' : '否') },
            { title: '问题', dataIndex: 'issues', render: (v: string[]) => v.join('；') || '-' },
            { title: '评价时间', dataIndex: 'reviewedAt', render: (v: string) => (v ? dayjs(v).format('MM-DD HH:mm') : '-') },
          ]}
        />
      </Card>
    </Space>
  );
}

// ---------------------------------------------------------------------------
// 页面
// ---------------------------------------------------------------------------
export default function BloodQualityPage() {
  const { dbUp, healthChecking, checkHealth, loadEfficacyList, loadUtilizationList } =
    useBloodQualityStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      const up = await checkHealth();
      if (up) {
        await loadEfficacyList();
        await loadUtilizationList();
      }
      setReady(true);
    })();
  }, [checkHealth, loadEfficacyList, loadUtilizationList]);

  const onRefresh = async () => {
    const up = await checkHealth();
    if (up) {
      await loadEfficacyList();
      await loadUtilizationList();
    }
  };

  return (
    <Watermark content={watermarkText}>
      <Layout className="min-h-screen bg-ink-bg">
        <Header className="flex items-center justify-between bg-jl-primary px-6 shadow-card">
          <div className="flex items-center gap-3">
            <SafetyCertificateOutlined className="text-2xl text-white" />
            <Typography.Title level={4} className="!mb-0 !text-white">
              临床用血质量
            </Typography.Title>
            <span className="hidden text-sm text-white/70 md:block">
              疗效评估 · 合理性评价 · 等级评审质控指标
            </span>
          </div>
          <Tag color={dbUp ? 'green' : 'red'} data-testid="blood-quality-health-tag">
            {dbUp ? 'BFF/DB 正常 (up)' : 'BFF/DB 不可用'}
          </Tag>
        </Header>
        <Content className="p-4">
          <DemoModeBanner />
          <Spin spinning={!ready || healthChecking}>
            {!dbUp ? (
              <Alert
                data-testid="blood-quality-offline-alert"
                type="error"
                showIcon
                banner
                message="无法连接 BFF 或数据库，用血质量工作站不可用"
                description="请检查数据库服务；恢复后点击刷新重新探活。系统不会以缓存或假数据冒充用血质量结果。"
                action={
                  <button
                    type="button"
                    className="ant-btn ant-btn-default"
                    onClick={() => void onRefresh()}
                  >
                    重新探活
                  </button>
                }
              />
            ) : (
              <Tabs
                defaultActiveKey="metrics"
                items={[
                  { key: 'metrics', label: '质控指标', children: <MetricsTab /> },
                  { key: 'efficacy', label: '疗效评估', children: <EfficacyTab /> },
                  { key: 'utilization', label: '合理性评价', children: <UtilizationTab /> },
                ]}
              />
            )}
          </Spin>
        </Content>
      </Layout>
    </Watermark>
  );
}
