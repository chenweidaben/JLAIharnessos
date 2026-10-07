/**
 * 健澜科技 jlmedaios - 检查检验结果 AI 智能解读工作站（M12-A）
 *
 * 健康门禁 + Watermark + 断库 Alert（无假数据）+ 错误 Alert。
 * 视角切换（医生/患者）× 模式（自动/仅规则/强制 LLM）；
 * Tab：检验解读 / 影像解读 / 待复核队列（患者端隐藏队列与签名）。
 *
 * 医疗安全：AI 仅辅助、解读须医师签名后生效；未配置 LLM 时明确降级标注，
 * 绝不显示冒充的 LLM 文本；患者端只给通俗说明，不做确定性诊断/自行用药建议/虚假保证。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Input,
  Layout,
  List,
  Radio,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Typography,
  Watermark,
} from 'antd';
import { RobotOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { useLabInterpStore } from '@/store/labInterpStore';
import { useImagingInterpretStore } from '@/store/imagingInterpretStore';
import { useAuthStore } from '@/store/authStore';
import type {
  InterpretAudience,
  InterpretMode,
  LabInterpretation,
  LlmStatus,
  TrendDirection,
} from '@/types/labInterpret';
import type { ImagingInterpretation } from '@/types/imagingInterpret';

const { Header, Content } = Layout;
const watermarkText = ['健澜科技', 'AI 智能解读', 'jlmedaios'];

function fmtTime(v: string | null): string {
  return v ? dayjs(v).format('MM-DD HH:mm') : '-';
}

/** 写操作 fire-and-forget：失败原因已写入 store.error 并由页面 Alert 展示；吞掉 rethrow 避免未处理 rejection。 */
function run(p: Promise<unknown>): void {
  void p.catch(() => undefined);
}

/* --------------------------- LLM 三态标注 --------------------------- */

const LLM_STATUS_META: Record<LlmStatus, { color: string; text: string }> = {
  llm_ok: { color: 'green', text: 'LLM 深度解读' },
  llm_not_configured: { color: 'orange', text: '未配置 LLM · 规则解读（降级标注）' },
  llm_error: { color: 'red', text: 'LLM 调用失败 · 规则解读回退' },
  rule_only: { color: 'default', text: '纯规则解读' },
};

function LlmBadge({ r }: { r: LabInterpretation | ImagingInterpretation }) {
  const meta = LLM_STATUS_META[r.llmStatus] ?? LLM_STATUS_META.rule_only;
  return (
    <Space size={4} wrap>
      <Tag color={meta.color} data-testid="llm-badge">
        {meta.text}
      </Tag>
      {r.llmStatus === 'llm_ok' && r.model && (
        <Tag color="blue" data-testid="llm-model">
          模型：{r.model}
        </Tag>
      )}
    </Space>
  );
}

const TREND_META: Record<TrendDirection, { color: string; text: string }> = {
  rising: { color: 'red', text: '上升' },
  falling: { color: 'blue', text: '下降' },
  stable: { color: 'green', text: '稳定' },
  no_history: { color: 'default', text: '无历史' },
};

const REC_LEVEL_META: Record<string, { color: string; text: string }> = {
  urgent: { color: 'red', text: '紧急' },
  high: { color: 'orange', text: '高' },
  medium: { color: 'gold', text: '中' },
  low: { color: 'blue', text: '低' },
  routine: { color: 'default', text: '常规' },
};

/** 患者端安全提示：不做确定性诊断、不建议自行用药、紧急就医提示。 */
const PATIENT_SAFETY =
  '以下为通俗健康说明，不构成诊断或用药建议；请勿自行用药/停药，如有不适请及时就医或急诊。';

function SafetyBanner() {
  return (
    <Alert
      type="info"
      showIcon
      className="mb-3"
      data-testid="safety-banner"
      message="AI 解读仅为辅助参考，不构成确诊；正式解读须经医师签名后生效。"
    />
  );
}

/* ------------------------------ 检验解读 Tab ------------------------------ */
function LabTab({
  audience,
  mode,
}: {
  audience: InterpretAudience;
  mode: InterpretMode;
}) {
  const { current, loading, generate } = useLabInterpStore();
  const hasPerm = useAuthStore((s) => s.hasPermission);
  const [visitId, setVisitId] = useState('');

  const onGenerate = () => run(generate(visitId.trim(), audience, mode));

  return (
    <Space direction="vertical" className="w-full" size="middle">
      <Card size="small" title="检验结果 AI 解读（按就诊 visitId 生成）">
        <Space wrap>
          <Input
            placeholder="就诊 visitId"
            value={visitId}
            onChange={(e) => setVisitId(e.target.value)}
            style={{ width: 260 }}
            data-testid="lab-visit-input"
          />
          {hasPerm('lab:interpret:sign') && (
            <Button type="primary" onClick={onGenerate} loading={loading} data-testid="lab-generate-btn">
              生成检验解读
            </Button>
          )}
        </Space>
      </Card>

      {current && current.visitId && (
        <Card size="small" title="检验解读结果" extra={<LlmBadge r={current} />}>
          <SafetyBanner />
          {audience === 'patient' ? (
            <>
              <Alert type="warning" showIcon message={PATIENT_SAFETY} className="mb-3" />
              <Typography.Paragraph data-testid="lab-plain-summary">
                {current.plainLanguageSummary ?? '（暂无通俗总结）'}
              </Typography.Paragraph>
            </>
          ) : (
            <>
              {current.overallImpression && (
                <div className="mb-3">
                  <Typography.Text strong>整体印象（参考方向，非确诊）：</Typography.Text>
                  <Typography.Paragraph data-testid="lab-overall-impression">
                    {current.overallImpression}
                  </Typography.Paragraph>
                </div>
              )}

              {current.criticalItems.length > 0 && (
                <Alert
                  type="error"
                  showIcon
                  className="mb-3"
                  message={`危急项 ${current.criticalItems.length} 项：${current.criticalItems
                    .map((i) => `${i.item}(${i.value}${i.unit ?? ''})`)
                    .join('、')}`}
                />
              )}

              {current.itemExplanations.length > 0 && (
                <List
                  size="small"
                  header={<strong>逐项临床意义</strong>}
                  bordered
                  dataSource={current.itemExplanations}
                  renderItem={(it) => (
                    <List.Item>
                      <List.Item.Meta
                        title={it.name}
                        description={it.meaning}
                      />
                    </List.Item>
                  )}
                />
              )}

              {current.trends.length > 0 && (
                <Table
                  className="mt-3"
                  size="small"
                  rowKey={(row) => row.code}
                  dataSource={current.trends}
                  pagination={false}
                  data-testid="lab-trends-table"
                  columns={[
                    { title: '项目', dataIndex: 'name' },
                    {
                      title: '前次',
                      key: 'previous',
                      render: (_: unknown, row) =>
                        row.previous == null ? '-' : `${row.previous}${row.unit ?? ''}`,
                    },
                    {
                      title: '本次',
                      key: 'current',
                      render: (_: unknown, row) =>
                        row.current == null ? '-' : `${row.current}${row.unit ?? ''}`,
                    },
                    {
                      title: '变化',
                      key: 'delta',
                      render: (_: unknown, row) =>
                        row.delta == null ? '-' : (row.delta > 0 ? `+${row.delta}` : row.delta),
                    },
                    {
                      title: '幅度',
                      key: 'pct',
                      render: (_: unknown, row) =>
                        row.pct == null ? '-' : `${row.pct > 0 ? '+' : ''}${row.pct}%`,
                    },
                    {
                      title: '趋势',
                      dataIndex: 'direction',
                      render: (d: TrendDirection) => (
                        <Tag color={TREND_META[d]?.color}>{TREND_META[d]?.text ?? d}</Tag>
                      ),
                    },
                  ]}
                />
              )}

              {current.recommendations.length > 0 && (
                <List
                  className="mt-3"
                  size="small"
                  header={<strong>分级建议</strong>}
                  bordered
                  dataSource={current.recommendations}
                  renderItem={(rec) => (
                    <List.Item>
                      <Space>
                        <Tag color={REC_LEVEL_META[rec.level]?.color}>
                          {REC_LEVEL_META[rec.level]?.text ?? rec.level}
                        </Tag>
                        <span>{rec.text}</span>
                      </Space>
                    </List.Item>
                  )}
                />
              )}

              <Descriptions size="small" column={3} className="mt-3">
                <Descriptions.Item label="状态">
                  <Tag color={current.status === 'signed' ? 'green' : current.status === 'rejected' ? 'red' : 'gold'}>
                    {current.status === 'signed' ? '已签名' : current.status === 'rejected' ? '已退回' : '待复核'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="生成时间">{fmtTime(current.generatedAt)}</Descriptions.Item>
                <Descriptions.Item label="引擎">{current.engineVersion}</Descriptions.Item>
              </Descriptions>
            </>
          )}
        </Card>
      )}
    </Space>
  );
}

/* ------------------------------ 影像解读 Tab ------------------------------ */
function ImagingTab({
  audience,
  mode,
}: {
  audience: InterpretAudience;
  mode: InterpretMode;
}) {
  const { current, loading, generate } = useImagingInterpretStore();
  const hasPerm = useAuthStore((s) => s.hasPermission);
  const [reportId, setReportId] = useState('');

  const onGenerate = () => run(generate(reportId.trim(), audience, mode));

  return (
    <Space direction="vertical" className="w-full" size="middle">
      <Card size="small" title="影像报告 AI 解读（按已发布报告 reportId 生成）">
        <Space wrap>
          <Input
            placeholder="影像报告 reportId"
            value={reportId}
            onChange={(e) => setReportId(e.target.value)}
            style={{ width: 260 }}
            data-testid="imaging-report-input"
          />
          {hasPerm('imaging:interpret:sign') && (
            <Button type="primary" onClick={onGenerate} loading={loading} data-testid="imaging-generate-btn">
              生成影像解读
            </Button>
          )}
        </Space>
      </Card>

      {current && (
        <Card
          size="small"
          title={`影像解读结果${current.examName ? `：${current.examName}` : ''}`}
          extra={<LlmBadge r={current} />}
        >
          <SafetyBanner />
          {audience === 'patient' ? (
            <>
              <Alert type="warning" showIcon message={PATIENT_SAFETY} className="mb-3" />
              <Typography.Paragraph data-testid="imaging-plain-summary">
                {current.plainLanguageSummary ?? '（暂无通俗总结）'}
              </Typography.Paragraph>
            </>
          ) : (
            <>
              {current.explainedFindings.length > 0 && (
                <List
                  size="small"
                  header={<strong>影像所见解释</strong>}
                  bordered
                  dataSource={current.explainedFindings}
                  renderItem={(f) => (
                    <List.Item>
                      <List.Item.Meta title={f.finding} description={f.explanation} />
                    </List.Item>
                  )}
                />
              )}
              {current.overallDirection && (
                <div className="mt-3">
                  <Typography.Text strong>可能方向（非诊断）：</Typography.Text>
                  <Typography.Paragraph data-testid="imaging-overall-direction">
                    {current.overallDirection}
                  </Typography.Paragraph>
                </div>
              )}
              {current.recommendations.length > 0 && (
                <List
                  className="mt-3"
                  size="small"
                  header={<strong>建议</strong>}
                  bordered
                  dataSource={current.recommendations}
                  renderItem={(rec) => (
                    <List.Item>
                      <Space>
                        <Tag color={REC_LEVEL_META[rec.level]?.color}>
                          {REC_LEVEL_META[rec.level]?.text ?? rec.level}
                        </Tag>
                        <span>{rec.text}</span>
                      </Space>
                    </List.Item>
                  )}
                />
              )}
            </>
          )}
        </Card>
      )}
    </Space>
  );
}

/* ------------------------------ 待复核队列 Tab ------------------------------ */
function QueueTab() {
  const lab = useLabInterpStore();
  const imaging = useImagingInterpretStore();
  const hasPerm = useAuthStore((s) => s.hasPermission);
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});

  return (
    <Space direction="vertical" className="w-full" size="middle">
      <Card size="small" title="检验解读待复核队列">
        <Table
          size="small"
          rowKey="id"
          dataSource={lab.items}
          pagination={{ pageSize: 6 }}
          columns={[
            { title: '就诊', dataIndex: 'visitNo', render: (v: string) => v ?? '-' },
            { title: '患者', dataIndex: 'patientName' },
            { title: '科室', dataIndex: 'department' },
            { title: '异常', dataIndex: 'abnormalCount' },
            { title: '危急', dataIndex: 'criticalCount' },
            {
              title: '状态',
              dataIndex: 'status',
              render: (s: string) => (
                <Tag color={s === 'signed' ? 'green' : s === 'rejected' ? 'red' : 'gold'}>
                  {s === 'signed' ? '已签名' : s === 'rejected' ? '已退回' : '待复核'}
                </Tag>
              ),
            },
            {
              title: '操作',
              key: 'op',
              render: (_: unknown, row: { id: string; status: string }) => (
                <Space>
                  {hasPerm('lab:interpret:sign') && row.status === 'pending_review' && (
                    <>
                      <Button
                        size="small"
                        type="primary"
                        onClick={() => run(lab.sign(row.id))}
                        data-testid={`lab-sign-${row.id}`}
                      >
                        签名
                      </Button>
                      <Input
                        size="small"
                        placeholder="退回原因"
                        style={{ width: 160 }}
                        value={rejectReasons[row.id] ?? ''}
                        onChange={(e) =>
                          setRejectReasons((prev) => ({ ...prev, [row.id]: e.target.value }))
                        }
                      />
                      <Button
                        size="small"
                        danger
                        onClick={() => run(lab.reject(row.id, rejectReasons[row.id] ?? ''))}
                        data-testid={`lab-reject-${row.id}`}
                      >
                        退回
                      </Button>
                    </>
                  )}
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Card size="small" title="影像解读待复核队列">
        <Table
          size="small"
          rowKey="id"
          dataSource={imaging.items}
          pagination={{ pageSize: 6 }}
          columns={[
            { title: '报告', dataIndex: 'reportId', render: (v: string) => v?.slice(0, 8) ?? '-' },
            { title: '患者', dataIndex: 'patientName' },
            { title: '科室', dataIndex: 'department' },
            { title: '检查', dataIndex: 'examName', render: (v: string | null) => v ?? '-' },
            {
              title: '状态',
              dataIndex: 'status',
              render: (s: string) => (
                <Tag color={s === 'signed' ? 'green' : s === 'rejected' ? 'red' : 'gold'}>
                  {s === 'signed' ? '已签名' : s === 'rejected' ? '已退回' : '待复核'}
                </Tag>
              ),
            },
            {
              title: '操作',
              key: 'op',
              render: (_: unknown, row: { id: string; status: string }) => (
                <Space>
                  {hasPerm('imaging:interpret:sign') && row.status === 'pending_review' && (
                    <>
                      <Button
                        size="small"
                        type="primary"
                        onClick={() => run(imaging.sign(row.id))}
                        data-testid={`imaging-sign-${row.id}`}
                      >
                        签名
                      </Button>
                      <Input
                        size="small"
                        placeholder="退回原因"
                        style={{ width: 160 }}
                        value={rejectReasons[row.id] ?? ''}
                        onChange={(e) =>
                          setRejectReasons((prev) => ({ ...prev, [row.id]: e.target.value }))
                        }
                      />
                      <Button
                        size="small"
                        danger
                        onClick={() => run(imaging.reject(row.id, rejectReasons[row.id] ?? ''))}
                        data-testid={`imaging-reject-${row.id}`}
                      >
                        退回
                      </Button>
                    </>
                  )}
                </Space>
              ),
            },
          ]}
        />
      </Card>
    </Space>
  );
}

/* --------------------------------- 页面 --------------------------------- */
export default function InterpretPage() {
  const { dbUp, healthChecking, error, checkHealth, loadQueue } = useLabInterpStore();
  const loadImagingQueue = useImagingInterpretStore((s) => s.loadQueue);
  const [ready, setReady] = useState(false);
  const [audience, setAudience] = useState<InterpretAudience>('doctor');
  const [mode, setMode] = useState<InterpretMode>('auto');

  useEffect(() => {
    void (async () => {
      const up = await checkHealth();
      if (up) {
        await Promise.all([loadQueue(undefined, 'doctor'), loadImagingQueue(undefined, 'doctor')]);
      }
      setReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkHealth, loadQueue, loadImagingQueue]);

  const onRefresh = async () => {
    const up = await checkHealth();
    if (up) {
      await Promise.all([loadQueue(undefined, audience), loadImagingQueue(undefined, audience)]);
    }
  };

  // 切换视角：清空当前解读草稿并按新视角重载队列（患者端不加载/展示队列）。
  const onAudienceChange = (a: InterpretAudience) => {
    setAudience(a);
    useLabInterpStore.setState({ current: null });
    useImagingInterpretStore.setState({ current: null });
    if (dbUp) {
      void (async () => {
        if (a === 'doctor') {
          await Promise.all([loadQueue(undefined, a), loadImagingQueue(undefined, a)]);
        }
      })();
    }
  };

  const tabs = [
    { key: 'lab', label: '检验解读', children: <LabTab audience={audience} mode={mode} /> },
    { key: 'imaging', label: '影像解读', children: <ImagingTab audience={audience} mode={mode} /> },
    ...(audience === 'doctor'
      ? [{ key: 'queue', label: '待复核队列', children: <QueueTab /> }]
      : []),
  ];

  return (
    <Watermark content={watermarkText}>
      <Layout className="min-h-screen bg-ink-bg">
        <Header className="flex items-center justify-between bg-jl-primary px-6 shadow-card">
          <div className="flex items-center gap-3">
            <RobotOutlined className="text-2xl text-white" />
            <Typography.Title level={4} className="!mb-0 !text-white">
              AI 智能解读工作站
            </Typography.Title>
            <span className="hidden text-sm text-white/70 md:block">
              检验 · 影像 · 双视角 · LLM 三态
            </span>
          </div>
          <Tag color={dbUp ? 'green' : 'red'} data-testid="interpret-health-tag">
            {dbUp ? 'BFF/DB 正常 (up)' : 'BFF/DB 不可用'}
          </Tag>
        </Header>
        <Content className="p-4">
          <DemoModeBanner />
          {error && (
            <Alert
              data-testid="interpret-error-alert"
              className="mb-3"
              type="error"
              showIcon
              message={error}
            />
          )}
          <Spin spinning={!ready || healthChecking}>
            {!dbUp ? (
              <Alert
                data-testid="interpret-offline-alert"
                type="error"
                showIcon
                banner
                message="无法连接 BFF 或数据库，AI 解读工作站不可用"
                description="请检查数据库服务；恢复后点击刷新重新探活。系统不会以缓存或假数据冒充解读结果。"
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
              <Space direction="vertical" className="w-full" size="middle">
                <Card size="small" title="解读视角与生成模式">
                  <Space wrap>
                    <Typography.Text>视角：</Typography.Text>
                    <Radio.Group
                      value={audience}
                      onChange={(e) => onAudienceChange(e.target.value as InterpretAudience)}
                      optionType="button"
                      buttonStyle="solid"
                      data-testid="audience-switch"
                      options={[
                        { value: 'doctor', label: '医生视角' },
                        { value: 'patient', label: '患者视角' },
                      ]}
                    />
                    <Typography.Text className="ml-3">模式：</Typography.Text>
                    <Radio.Group
                      value={mode}
                      onChange={(e) => setMode(e.target.value as InterpretMode)}
                      optionType="button"
                      data-testid="mode-switch"
                      options={[
                        { value: 'auto', label: '自动' },
                        { value: 'rule', label: '仅规则' },
                        { value: 'llm', label: '强制 LLM' },
                      ]}
                    />
                  </Space>
                </Card>
                <Tabs defaultActiveKey="lab" items={tabs} />
              </Space>
            )}
          </Spin>
        </Content>
      </Layout>
    </Watermark>
  );
}
