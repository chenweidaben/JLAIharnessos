/**
 * 健澜科技 jlmedaios - VTE 智能防治工作站（M13-A）
 *
 * 全国肺栓塞和深静脉血栓形成防治能力建设项目（VTE 防治中心）。
 * 风险评估（Caprini 外科 / Padua 内科，前端实时算分）+ 出血风险 + 高危看板 +
 * 预防措施联动（机械执行 / 药物确认签名）+ 结局不良事件 + 质控指标。
 *
 * 医疗安全：AI 不自主诊断/开抗凝药；药物预防一律 suggested，须医师 vte:prevent 确认签名。
 * 健康门禁：BFF/DB 不可用时显式 Alert + Watermark，不渲染业务内容、不以假数据冒充。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  DatePicker,
  Descriptions,
  Input,
  Layout,
  Segmented,
  Select,
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
import { useVteStore } from '@/store/vteStore';
import { useAuthStore } from '@/store/authStore';
import {
  assessBleeding,
  BLEEDING_FACTORS,
  CAPRINI_FACTORS,
  capriniLevel,
  PADUA_FACTORS,
  paduaLevel,
  recommendPrevention,
  scoreCaprini,
  scorePadua,
  VTE_LEVEL_COLOR,
  VTE_LEVEL_LABEL,
} from '@/utils/vteRisk';
import type {
  VteEventType,
  VteOccasion,
  VtePrevention,
  VteScale,
} from '@/types/vte';

const { Header, Content } = Layout;
const { RangePicker } = DatePicker;
const watermarkText = ['健澜科技', 'VTE 防治', 'jlmedaios'];

/** 写操作 fire-and-forget：失败原因已写入 store.error 并由页面 Alert 展示；吞掉 rethrow。 */
function run(p: Promise<unknown>): void {
  void p.catch(() => undefined);
}

function fmtTime(v: string | null): string {
  return v ? dayjs(v).format('MM-DD HH:mm') : '-';
}

const METHOD_LABEL: Record<string, string> = {
  ipc: '间歇充气加压(IPC)',
  gcs: '梯度压力袜(GCS)',
  foot_pump: '足底静脉泵',
  lmwh: '低分子肝素',
  ufh: '普通肝素',
  fondaparinux: '磺达肝癸钠',
  rivaroxaban: '利伐沙班',
  other: '其他药物',
  early_mobilization: '早期活动/基础预防',
};

const PREVENTION_STATUS_META: Record<VtePrevention['status'], { color: string; text: string }> = {
  suggested: { color: 'gold', text: '建议(待确认)' },
  confirmed: { color: 'blue', text: '已确认' },
  executed: { color: 'green', text: '已执行' },
  contraindicated: { color: 'red', text: '禁忌/暂缓' },
  discontinued: { color: 'default', text: '已停用' },
};

const EVENT_TYPE_LABEL: Record<VteEventType, string> = {
  dvt: '深静脉血栓(DVT)',
  pe: '肺栓塞(PE)',
  bleeding: '出血',
  anticoag_adverse: '抗凝相关不良事件',
};

const OCCASION_LABEL: Record<VteOccasion, string> = {
  admission: '入院评估',
  postop: '术后评估',
  condition_change: '病情变化',
  reassessment: '重新评估',
};

/* ---------------------------------------------------------------------------
 * Tab 1：风险评估（前端实时算分）
 * ------------------------------------------------------------------------ */
function AssessTab() {
  const hasPerm = useAuthStore((s) => s.hasPermission);
  const { assess } = useVteStore();

  const [visitId, setVisitId] = useState('');
  const [scale, setScale] = useState<VteScale>('caprini');
  const [occasion, setOccasion] = useState<VteOccasion>('admission');
  const [vteKeys, setVteKeys] = useState<string[]>([]);
  const [bleedKeys, setBleedKeys] = useState<string[]>([]);
  const [note, setNote] = useState('');

  const factorDefs = scale === 'caprini' ? CAPRINI_FACTORS : PADUA_FACTORS;

  const live = useMemo(() => {
    const scored = scale === 'caprini' ? scoreCaprini(vteKeys) : scorePadua(vteKeys);
    const level = scale === 'caprini' ? capriniLevel(scored.score) : paduaLevel(scored.score);
    const bleeding = assessBleeding(bleedKeys);
    const advice = recommendPrevention({ scale, vteLevel: level, bleedingLevel: bleeding.level });
    return { score: scored.score, level, bleeding, advice };
  }, [scale, vteKeys, bleedKeys]);

  const onScaleChange = (s: VteScale) => {
    setScale(s);
    setVteKeys([]);
  };

  const onSubmit = () => {
    run(
      assess({
        visitId: visitId.trim(),
        scale,
        occasion,
        vteFactorKeys: vteKeys,
        bleedingFactorKeys: bleedKeys,
        note: note.trim() || undefined,
      }),
    );
  };

  return (
    <Space direction="vertical" className="w-full" size="middle">
      <Card size="small" title="风险评估（勾选危险因素，自动算分；评分须由有资质人员确认）">
        <Space direction="vertical" className="w-full">
          <Space wrap>
            <span>就诊 ID：</span>
            <Input
              placeholder="输入就诊 UUID"
              value={visitId}
              onChange={(e) => setVisitId(e.target.value)}
              style={{ width: 280 }}
              data-testid="vte-assess-visit"
            />
            <Segmented
              options={[
                { label: 'Caprini（外科/手术）', value: 'caprini' },
                { label: 'Padua（内科）', value: 'padua' },
              ]}
              value={scale}
              onChange={(v) => onScaleChange(v as VteScale)}
            />
            <span>评估时点：</span>
            <Select
              value={occasion}
              style={{ width: 160 }}
              onChange={(v) => setOccasion(v as VteOccasion)}
              options={(Object.keys(OCCASION_LABEL) as VteOccasion[]).map((k) => ({
                value: k,
                label: OCCASION_LABEL[k],
              }))}
            />
          </Space>

          <Card size="small" type="inner" title={`${scale === 'caprini' ? 'Caprini' : 'Padua'} 危险因素`}>
            <Checkbox.Group style={{ width: '100%' }} value={vteKeys}
              onChange={(arr) => setVteKeys(arr as string[])}>
              <Space wrap>
                {Object.entries(factorDefs).map(([key, def]) => (
                  <Checkbox key={key} value={key}>
                    {def.label}（{def.points}分）
                  </Checkbox>
                ))}
              </Space>
            </Checkbox.Group>
          </Card>

          <Card size="small" type="inner" title="出血风险因素（命中任一 => 高出血风险）">
            <Checkbox.Group style={{ width: '100%' }} value={bleedKeys}
              onChange={(arr) => setBleedKeys(arr as string[])}>
              <Space wrap>
                {Object.entries(BLEEDING_FACTORS).map(([key, label]) => (
                  <Checkbox key={key} value={key}>
                    {label}
                  </Checkbox>
                ))}
              </Space>
            </Checkbox.Group>
          </Card>

          <Descriptions size="small" column={3} bordered>
            <Descriptions.Item label="VTE 总分">
              <span data-testid="vte-live-score">{live.score}</span>
            </Descriptions.Item>
            <Descriptions.Item label="风险层级">
              <Tag color={VTE_LEVEL_COLOR[live.level]} data-testid="vte-live-level">
                {VTE_LEVEL_LABEL[live.level]}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="出血风险">
              <Tag color={live.bleeding.level === 'high' ? 'red' : 'green'} data-testid="vte-live-bleeding">
                {live.bleeding.level === 'high' ? '高出血风险' : '低出血风险'}
              </Tag>
            </Descriptions.Item>
          </Descriptions>

          {live.advice.length > 0 && (
            <Alert
              type="info"
              showIcon
              data-testid="vte-advice"
              message="预防建议（辅助决策，须医师确认；AI 不自主开抗凝药）"
              description={
                <ul className="!my-1 list-disc pl-5">
                  {live.advice.map((a) => (
                    <li key={`${a.category}-${a.method}`}>
                      <Tag color={a.category === 'mechanical' ? 'cyan' : 'purple'}>
                        {a.category === 'mechanical' ? '机械' : '药物'}
                      </Tag>
                      {METHOD_LABEL[a.method] ?? a.method}：{a.rationale}
                      {a.deferred && <Typography.Text type="danger">（{a.deferred}）</Typography.Text>}
                    </li>
                  ))}
                </ul>
              }
            />
          )}

          <Input.TextArea
            rows={2}
            placeholder="评估备注（可选）"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          {hasPerm('vte:assess') ? (
            <Button type="primary" onClick={onSubmit} data-testid="vte-assess-submit">
              提交评估
            </Button>
          ) : (
            <Typography.Text type="secondary">当前角色无 vte:assess 权限，不可提交评估</Typography.Text>
          )}
        </Space>
      </Card>
    </Space>
  );
}

/* ---------------------------------------------------------------------------
 * Tab 2：高危患者看板
 * ------------------------------------------------------------------------ */
function HighRiskTab() {
  const { highRiskList } = useVteStore();
  return (
    <Card size="small" title="高危/极高危患者看板（各就诊最新评估；预警为建议性，非阻断）">
      <Table
        size="small"
        rowKey="visitId"
        dataSource={highRiskList}
        pagination={{ pageSize: 10 }}
        columns={[
          { title: '就诊 ID', dataIndex: 'visitId', render: (v: string) => v.slice(0, 8) },
          { title: '患者', dataIndex: 'patientName', render: (v: string | null) => v ?? '-' },
          { title: '科室', dataIndex: 'department', render: (v: string | null) => v ?? '-' },
          {
            title: '量表',
            dataIndex: 'scale',
            render: (s: VteScale) => (s === 'caprini' ? 'Caprini' : 'Padua'),
          },
          { title: '评分', dataIndex: 'vteScore' },
          {
            title: '风险层级',
            dataIndex: 'vteLevel',
            render: (l: keyof typeof VTE_LEVEL_COLOR) => (
              <Tag color={VTE_LEVEL_COLOR[l]}>{VTE_LEVEL_LABEL[l]}</Tag>
            ),
          },
          {
            title: '预防匹配',
            dataIndex: 'preventionMismatch',
            render: (mismatch: boolean) =>
              mismatch ? (
                <Tag color="red" data-testid="vte-mismatch-tag">高危未预防</Tag>
              ) : (
                <Tag color="green">已预防</Tag>
              ),
          },
          { title: '评估时间', dataIndex: 'assessedAt', render: (v: string | null) => fmtTime(v) },
        ]}
      />
    </Card>
  );
}

/* ---------------------------------------------------------------------------
 * Tab 3：就诊详情（评估历史 + 预防执行/确认 + 结局）
 * ------------------------------------------------------------------------ */
function VisitDetailTab() {
  const hasPerm = useAuthStore((s) => s.hasPermission);
  const { visitDetail, loadVisitDetail, confirm, execute, contraindicate, recordOutcome } =
    useVteStore();
  const [visitId, setVisitId] = useState('');
  const [outcomeType, setOutcomeType] = useState<VteEventType>('dvt');
  const [outcomeDesc, setOutcomeDesc] = useState('');

  const onLoad = () => {
    if (visitId.trim()) void loadVisitDetail(visitId.trim());
  };

  const onRecordOutcome = () => {
    run(
      recordOutcome({
        visitId: visitId.trim(),
        eventType: outcomeType,
        description: outcomeDesc.trim() || undefined,
      }),
    );
  };

  return (
    <Space direction="vertical" className="w-full" size="middle">
      <Card size="small" title="就诊 VTE 全详情">
        <Space wrap>
          <Input
            placeholder="输入就诊 UUID"
            value={visitId}
            onChange={(e) => setVisitId(e.target.value)}
            style={{ width: 280 }}
            data-testid="vte-detail-visit"
          />
          <Button type="primary" onClick={onLoad} data-testid="vte-detail-load">
            加载详情
          </Button>
        </Space>
      </Card>

      {visitDetail && (
        <>
          <Card size="small" title="评估历史（版本化）">
            <Table
              size="small"
              rowKey="id"
              dataSource={visitDetail.assessments}
              pagination={false}
              columns={[
                { title: '版本', dataIndex: 'version' },
                {
                  title: '量表',
                  dataIndex: 'scale',
                  render: (s: VteScale) => (s === 'caprini' ? 'Caprini' : 'Padua'),
                },
                {
                  title: '时点',
                  dataIndex: 'occasion',
                  render: (o: VteOccasion) => OCCASION_LABEL[o],
                },
                { title: '评分', dataIndex: 'vteScore' },
                {
                  title: '层级',
                  dataIndex: 'vteLevel',
                  render: (l: keyof typeof VTE_LEVEL_COLOR) => (
                    <Tag color={VTE_LEVEL_COLOR[l]}>{VTE_LEVEL_LABEL[l]}</Tag>
                  ),
                },
                {
                  title: '出血',
                  dataIndex: 'bleedingLevel',
                  render: (b: string) => (
                    <Tag color={b === 'high' ? 'red' : 'green'}>
                      {b === 'high' ? '高' : '低'}
                    </Tag>
                  ),
                },
                { title: '评估时间', dataIndex: 'assessedAt', render: (v: string | null) => fmtTime(v) },
              ]}
            />
          </Card>

          <Card size="small" title="预防措施（机械走护理执行；药物须医师确认签名）">
            <Table
              size="small"
              rowKey="id"
              dataSource={visitDetail.preventions}
              pagination={false}
              columns={[
                { title: '措施', dataIndex: 'method', render: (m: string) => METHOD_LABEL[m] ?? m },
                {
                  title: '类别',
                  dataIndex: 'category',
                  render: (c: string) => (c === 'mechanical' ? '机械预防' : '药物预防'),
                },
                { title: '剂量', dataIndex: 'dosage', render: (v: string | null) => v ?? '-' },
                { title: '频次', dataIndex: 'frequency', render: (v: string | null) => v ?? '-' },
                {
                  title: '状态',
                  dataIndex: 'status',
                  render: (s: VtePrevention['status']) => (
                    <Tag color={PREVENTION_STATUS_META[s].color}>{PREVENTION_STATUS_META[s].text}</Tag>
                  ),
                },
                {
                  title: '操作',
                  key: 'actions',
                  render: (_: unknown, row: VtePrevention) => (
                    <Space size={4}>
                      {row.category === 'pharmacological' &&
                        row.status === 'suggested' &&
                        hasPerm('vte:prevent') && (
                          <Button
                            size="small"
                            type="primary"
                            data-testid="vte-confirm-btn"
                            onClick={() => run(confirm(row.id))}
                          >
                            确认药物预防
                          </Button>
                        )}
                      {row.category === 'mechanical' &&
                        row.status === 'suggested' &&
                        hasPerm('vte:execute') && (
                          <Button
                            size="small"
                            data-testid="vte-execute-btn"
                            onClick={() => run(execute(row.id))}
                          >
                            执行
                          </Button>
                        )}
                      {row.status === 'suggested' && (
                        <Button
                          size="small"
                          danger
                          data-testid="vte-contra-btn"
                          onClick={() => run(contraindicate(row.id, '临床评估后暂缓/禁忌'))}
                        >
                          标记禁忌
                        </Button>
                      )}
                    </Space>
                  ),
                },
              ]}
            />
          </Card>

          <Card size="small" title="结局与不良事件">
            <Space wrap className="mb-2">
              <Select
                value={outcomeType}
                style={{ width: 200 }}
                onChange={(v) => setOutcomeType(v as VteEventType)}
                options={(Object.keys(EVENT_TYPE_LABEL) as VteEventType[]).map((k) => ({
                  value: k,
                  label: EVENT_TYPE_LABEL[k],
                }))}
              />
              <Input
                placeholder="事件描述（可选）"
                value={outcomeDesc}
                onChange={(e) => setOutcomeDesc(e.target.value)}
                style={{ width: 280 }}
              />
              <Button onClick={onRecordOutcome} data-testid="vte-outcome-btn">
                记录结局
              </Button>
            </Space>
            <Table
              size="small"
              rowKey="id"
              dataSource={visitDetail.outcomes}
              pagination={false}
              columns={[
                {
                  title: '类型',
                  dataIndex: 'eventType',
                  render: (t: VteEventType) => EVENT_TYPE_LABEL[t],
                },
                {
                  title: '来源',
                  dataIndex: 'source',
                  render: (s: string) =>
                    s === 'hospital_acquired' ? '医院获得性' : '入院即有',
                },
                { title: '描述', dataIndex: 'description', render: (v: string | null) => v ?? '-' },
                { title: '发生时间', dataIndex: 'occurredAt', render: (v: string | null) => fmtTime(v) },
              ]}
            />
          </Card>
        </>
      )}
    </Space>
  );
}

/* ---------------------------------------------------------------------------
 * Tab 4：质控指标
 * ------------------------------------------------------------------------ */
const METRIC_GOALS: Record<string, { title: string; goal: number; higher: boolean }> = {
  riskAssessmentRate: { title: '风险评估率', goal: 100, higher: true },
  highRiskPreventionRate: { title: '高危患者预防实施率', goal: 100, higher: true },
  hospitalVteRate: { title: '医院获得性 VTE 发生率', goal: 0, higher: false },
};
type VteMetricKey = 'riskAssessmentRate' | 'highRiskPreventionRate' | 'hospitalVteRate';
const METRIC_KEYS = Object.keys(METRIC_GOALS) as VteMetricKey[];

function MetricsTab() {
  const { metrics, loadMetrics } = useVteStore();
  const [range, setRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('month'),
    dayjs(),
  ]);
  const onLoad = () => {
    void loadMetrics(range[0].toISOString(), range[1].toISOString());
  };
  const m = metrics?.metrics;
  const cards = METRIC_KEYS.map((k) => ({
    key: k,
    title: METRIC_GOALS[k].title,
    value: m?.[k] ?? 0,
  }));

  return (
    <Space direction="vertical" className="w-full" size="middle">
      <Card size="small">
        <Space wrap>
          <RangePicker
            showTime
            value={range}
            onChange={(v) => v && v[0] && v[1] && setRange([v[0], v[1]])}
          />
          <Button type="primary" onClick={onLoad} data-testid="vte-metrics-load">
            加载质控指标
          </Button>
          {metrics && (
            <Typography.Text type="secondary">
              周期内出院 {metrics.discharges} 人
            </Typography.Text>
          )}
        </Space>
      </Card>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {cards.map((c) => {
          const goal = METRIC_GOALS[c.key];
          const ok = goal.higher ? c.value >= goal.goal : c.value <= goal.goal;
          return (
            <Card key={c.key} size="small">
              <Statistic
                title={c.title}
                value={c.value}
                precision={2}
                suffix="%"
                valueStyle={{ color: goal.goal === 0 ? '#1677ff' : ok ? '#3f8600' : '#cf1322' }}
              />
              {goal.goal > 0 && (
                <Tag color={ok ? 'green' : 'red'} className="mt-1">
                  目标 {goal.goal}% {ok ? '达标' : '未达标'}
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
            dataSource={METRIC_KEYS.map((k) => ({
              key: k,
              name: METRIC_GOALS[k].title,
              numerator: m.fractions[k].numerator,
              denominator: m.fractions[k].denominator,
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

/* ---------------------------------------------------------------------------
 * 页面
 * ------------------------------------------------------------------------ */
export default function VtePage() {
  const { dbUp, healthChecking, checkHealth, loadHighRisk, error } = useVteStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      const up = await checkHealth();
      if (up) await loadHighRisk();
      setReady(true);
    })();
  }, [checkHealth, loadHighRisk]);

  const onRefresh = async () => {
    const up = await checkHealth();
    if (up) await loadHighRisk();
  };

  return (
    <Watermark content={watermarkText}>
      <Layout className="min-h-screen bg-ink-bg">
        <Header className="flex items-center justify-between bg-jl-primary px-6 shadow-card">
          <div className="flex items-center gap-3">
            <SafetyCertificateOutlined className="text-2xl text-white" />
            <Typography.Title level={4} className="!mb-0 !text-white">
              VTE 智能防治
            </Typography.Title>
            <span className="hidden text-sm text-white/70 md:block">
              Caprini/Padua 评估 · 高危预警 · 预防联动 · 质控指标
            </span>
          </div>
          <Tag color={dbUp ? 'green' : 'red'} data-testid="vte-health-tag">
            {dbUp ? 'BFF/DB 正常 (up)' : 'BFF/DB 不可用'}
          </Tag>
        </Header>
        <Content className="p-4">
          <DemoModeBanner />
          <Spin spinning={!ready || healthChecking}>
            {!dbUp ? (
              <Alert
                data-testid="vte-offline-alert"
                type="error"
                showIcon
                banner
                message="无法连接 BFF 或数据库，VTE 防治工作站不可用"
                description="请检查数据库服务；恢复后点击刷新重新探活。系统不会以缓存或假数据冒充 VTE 评估/预防结果。"
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
                defaultActiveKey="assess"
                items={[
                  { key: 'assess', label: '风险评估', children: <AssessTab /> },
                  { key: 'highrisk', label: '高危看板', children: <HighRiskTab /> },
                  { key: 'detail', label: '就诊详情', children: <VisitDetailTab /> },
                  { key: 'metrics', label: '质控指标', children: <MetricsTab /> },
                ]}
              />
            )}
          </Spin>
          {error && dbUp && (
            <Alert data-testid="vte-error-alert" type="error" showIcon className="mt-3" message={error} />
          )}
        </Content>
      </Layout>
    </Watermark>
  );
}
