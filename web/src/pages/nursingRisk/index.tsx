/**
 * 健澜科技 jlmedaios - 压疮(Braden)/跌倒(Morse)风险预警工作站（M17-A）
 *
 * 四个核心 Tab：
 *  - 评估登记：按就诊登记 Braden/Morse，后端自动分层并生成建议性预防草稿；
 *  - 高危预警看板：各就诊最新高危评估，无 executed 预防 => 红色预警；
 *  - 预防执行：护士对建议草稿确认(accepted)->执行(本人签名 executed)，可取消；
 *  - 结局与指标：登记皮肤结局(二期及以上压疮)/跌倒事件，查看 NQI 高危率/发生率。
 *
 * 医疗安全：预防措施仅 suggested 草稿，护士 execute 时本人签名才落库；AI 不自主开医嘱。
 * 写按钮按 nursing_risk:execute 入口隐藏。健康门禁：BFF/DB 不可用显式红 Alert+水印，不渲染业务数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Input,
  Row,
  Select,
  Spin,
  Table,
  Tabs,
  Tag,
  Typography,
  Watermark,
  Layout,
  Space,
  message,
} from 'antd';
import { AlertOutlined, SafetyCertificateOutlined } from '@ant-design/icons';

import { useNursingRiskStore } from '@/store/nursingRiskStore';
import { usePermission } from '@/router/guards';
import {
  BRADEN_ITEMS,
  MORSE_ITEMS,
  riskTypeLabel,
  levelLabel,
  levelColor,
  preventionStatusLabel,
} from '@/utils/nursingRisk';
import type { RiskType } from '@/types/nursingRisk';

const { Header, Content } = Layout;
const watermarkText = ['健澜科技', '护理风险预警', 'jlmedaios'];

/** 写操作 fire-and-forget：失败原因已写入 store.error 并由页面 Alert 展示。 */
function run(p: Promise<unknown>): void {
  void p.catch(() => undefined);
}

function defaultRange(): { from: string; to: string } {
  return { from: '2000-01-01T00:00:00Z', to: '2100-01-01T00:00:00Z' };
}

/* ------------------------------------------------------------------ */
/* Tab 1：评估登记                                                     */
/* ------------------------------------------------------------------ */
function AssessTab() {
  const { assess, assessments, loadAssessments } = useNursingRiskStore();
  const { hasPermission } = usePermission();
  const canAssess = hasPermission('nursing_risk:assess');

  const [visitId, setVisitId] = useState('');
  const [riskType, setRiskType] = useState<RiskType>('pressure_ulcer');
  const [items, setItems] = useState<Record<string, number>>({});

  useEffect(() => {
    run(loadAssessments());
  }, [loadAssessments]);

  const onSubmit = () => {
    if (!visitId.trim()) {
      message.warning('请输入就诊 visitId');
      return;
    }
    run(
      assess({ visitId: visitId.trim(), riskType, items })
        .then((r) => {
          message.success(`评估完成：总分 ${r.assessment.totalScore}，${levelLabel(r.assessment.level)}`);
          return loadAssessments();
        })
        .catch(() => undefined),
    );
  };

  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Card size="small" title="登记风险评估">
        <Row gutter={8} style={{ marginBottom: 8 }}>
          <Col span={8}>
            <Input data-testid="risk-visit-id" placeholder="就诊 visitId" value={visitId} onChange={(e) => setVisitId(e.target.value)} />
          </Col>
          <Col span={6}>
            <Select
              style={{ width: '100%' }}
              data-testid="risk-type"
              value={riskType}
              onChange={(v) => { setRiskType(v); setItems({}); }}
              options={[
                { value: 'pressure_ulcer', label: '压疮 Braden' },
                { value: 'fall', label: '跌倒 Morse' },
              ]}
            />
          </Col>
        </Row>
        {riskType === 'pressure_ulcer' ? (
          <Row gutter={[8, 8]}>
            {BRADEN_ITEMS.map((i) => (
              <Col span={8} key={i.key}>
                <Input
                  data-testid={`risk-item-${i.key}`}
                  type="number"
                  placeholder={`${i.label} ${i.min}-${i.max}`}
                  value={items[i.key] ?? ''}
                  onChange={(e) => setItems((s) => ({ ...s, [i.key]: Number(e.target.value) || 0 }))}
                />
              </Col>
            ))}
          </Row>
        ) : (
          <Row gutter={[8, 8]}>
            {MORSE_ITEMS.map((i) => (
              <Col span={8} key={i.key}>
                <Select
                  style={{ width: '100%' }}
                  data-testid={`risk-item-${i.key}`}
                  placeholder={i.label}
                  value={items[i.key] ?? undefined}
                  onChange={(v) => setItems((s) => ({ ...s, [i.key]: v }))}
                  options={i.options.map((o) => ({ value: o.value, label: `${o.value}分 ${o.label}` }))}
                />
              </Col>
            ))}
          </Row>
        )}
        <Button
          style={{ marginTop: 8 }}
          type="primary"
          data-testid="risk-assess-btn"
          disabled={!canAssess}
          onClick={onSubmit}
        >
          登记评估并生成预防建议
        </Button>
        {!canAssess && <Typography.Text type="secondary" style={{ marginLeft: 8 }}>（仅医生/admin 可登记评估）</Typography.Text>}
      </Card>

      <Card size="small" title="评估记录">
        <Table
          size="small"
          rowKey="id"
          dataSource={assessments}
          pagination={false}
          columns={[
            { title: '评估单号', dataIndex: 'assessNo' },
            { title: '就诊', dataIndex: 'visitId', ellipsis: true },
            {
              title: '类型',
              dataIndex: 'riskType',
              render: (t: RiskType) => riskTypeLabel(t),
            },
            { title: '总分', dataIndex: 'totalScore' },
            {
              title: '层级',
              dataIndex: 'level',
              render: (l: string) => <Tag color={levelColor(l as never)}>{levelLabel(l as never)}</Tag>,
            },
            { title: '评估时间', dataIndex: 'assessedAt' },
          ]}
        />
      </Card>
    </Space>
  );
}

/* ------------------------------------------------------------------ */
/* Tab 2：高危预警看板                                                 */
/* ------------------------------------------------------------------ */
function BoardTab() {
  const { board, loadBoard } = useNursingRiskStore();

  useEffect(() => {
    run(loadBoard());
  }, [loadBoard]);

  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Card size="small" title="高危预警看板（无已执行预防 => 预警）">
        {board.length === 0 ? (
          <Alert type="success" showIcon message="当前无高危未落实风险" />
        ) : (
          <Table
            size="small"
            rowKey={(r) => `${r.assessment.id}`}
            dataSource={board}
            pagination={false}
            columns={[
              { title: '就诊', dataIndex: ['assessment', 'visitId'], ellipsis: true },
              {
                title: '类型',
                dataIndex: ['assessment', 'riskType'],
                render: (t: RiskType) => riskTypeLabel(t),
              },
              { title: '总分', dataIndex: ['assessment', 'totalScore'] },
              {
                title: '层级',
                render: () => <Tag color="red">高危</Tag>,
              },
              {
                title: '预警',
                render: (_: unknown, r: (typeof board)[number]) =>
                  r.warning.warning ? (
                    <AlertOutlined style={{ color: '#cf1322' }} data-testid={`risk-warn-${r.assessment.id}`} />
                  ) : (
                    <Tag color="green">已落实</Tag>
                  ),
              },
              {
                title: '原因',
                render: (_: unknown, r: (typeof board)[number]) => r.warning.reason || '已有 executed 预防',
              },
            ]}
          />
        )}
      </Card>
    </Space>
  );
}

/* ------------------------------------------------------------------ */
/* Tab 3：预防执行                                                     */
/* ------------------------------------------------------------------ */
function ExecuteTab() {
  const { preventions, loadDetail, detail, accept, execute, cancel } = useNursingRiskStore();
  const { hasPermission } = usePermission();
  const canExecute = hasPermission('nursing_risk:execute');

  const [visitId, setVisitId] = useState('');
  const [signature, setSignature] = useState('');

  const onLoad = () => {
    if (!visitId.trim()) return;
    run(loadDetail(visitId.trim()));
  };

  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Card size="small" title="按就诊加载预防措施">
        <Row gutter={8}>
          <Col span={10}>
            <Input data-testid="exec-visit-id" placeholder="就诊 visitId" value={visitId} onChange={(e) => setVisitId(e.target.value)} />
          </Col>
          <Col span={4}>
            <Button data-testid="exec-load-btn" type="primary" onClick={onLoad}>加载</Button>
          </Col>
        </Row>
      </Card>

      <Card size="small" title="预防措施（护士本人签名执行）">
        <Table
          size="small"
          rowKey="id"
          dataSource={preventions}
          pagination={false}
          columns={[
            { title: '措施编码', dataIndex: 'measureCode' },
            { title: '措施', dataIndex: 'measureDesc' },
            {
              title: '状态',
              dataIndex: 'status',
              render: (s: string) => <Tag color={s === 'executed' ? 'green' : s === 'cancelled' ? 'default' : 'orange'}>{preventionStatusLabel(s)}</Tag>,
            },
            {
              title: '执行签名',
              dataIndex: 'signature',
              render: (v: string | null) => v ?? '—',
            },
            {
              title: '操作',
              render: (_: unknown, r: (typeof preventions)[number]) => {
                if (!canExecute) return null;
                if (r.status === 'suggested') {
                  return (
                    <Button size="small" type="link" data-testid={`prev-accept-${r.id}`} onClick={() => run(accept(r.id).then(() => loadDetail(visitId.trim())))}>
                      确认
                    </Button>
                  );
                }
                if (r.status === 'accepted') {
                  return (
                    <span>
                      <Button size="small" type="link" data-testid={`prev-exec-${r.id}`} onClick={() => {
                        const sig = signature.trim() || '护士本人执行签名';
                        run(execute(r.id, sig).then(() => loadDetail(visitId.trim())));
                      }}>
                        签名执行
                      </Button>
                      <Button size="small" type="link" danger data-testid={`prev-cancel-${r.id}`} onClick={() => run(cancel(r.id).then(() => loadDetail(visitId.trim())))}>
                        取消
                      </Button>
                    </span>
                  );
                }
                return null;
              },
            },
          ]}
        />
        {canExecute && (
          <Input
            style={{ marginTop: 8, maxWidth: 320 }}
            data-testid="exec-signature"
            placeholder="执行护士本人签名（可留空用默认）"
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
          />
        )}
        {detail && (
          <Typography.Text type="secondary" style={{ marginLeft: 12 }}>
            该就诊高危未执行预警 {detail.warnings.length} 条
          </Typography.Text>
        )}
      </Card>
    </Space>
  );
}

/* ------------------------------------------------------------------ */
/* Tab 4：结局与指标                                                   */
/* ------------------------------------------------------------------ */
function EventMetricsTab() {
  const { events, loadEvents, loadMetrics, metrics, recordEvent } = useNursingRiskStore();
  const { hasPermission } = usePermission();
  const canExecute = hasPermission('nursing_risk:execute');

  const [visitId, setVisitId] = useState('');
  const [eventType, setEventType] = useState<string>('pressure_injury_stage2');
  const [description, setDescription] = useState('');

  useEffect(() => {
    const { from, to } = defaultRange();
    run(loadMetrics(from, to));
    run(loadEvents());
  }, [loadMetrics, loadEvents]);

  const onRecord = () => {
    if (!visitId.trim()) return;
    run(
      recordEvent({ visitId: visitId.trim(), eventType: eventType as never, description })
        .then(() => { setDescription(''); return loadEvents(visitId.trim()); })
        .catch(() => undefined),
    );
  };

  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Card size="small" title="NQI 指标（自动聚合）">
        {metrics ? (
          <Row gutter={16}>
            <Col span={6}>
              <Typography.Text strong>压疮高危率</Typography.Text>
              <div data-testid="metric-pressure-high">{metrics.metrics.pressureHighRiskRate}%</div>
              <Typography.Text type="secondary">
                {metrics.metrics.fractions.pressureHighRiskRate.numerator}/{metrics.metrics.fractions.pressureHighRiskRate.denominator}
              </Typography.Text>
            </Col>
            <Col span={6}>
              <Typography.Text strong>跌倒高危率</Typography.Text>
              <div data-testid="metric-fall-high">{metrics.metrics.fallHighRiskRate}%</div>
              <Typography.Text type="secondary">
                {metrics.metrics.fractions.fallHighRiskRate.numerator}/{metrics.metrics.fractions.fallHighRiskRate.denominator}
              </Typography.Text>
            </Col>
            <Col span={6}>
              <Typography.Text strong>压疮(二期+)发生率</Typography.Text>
              <div data-testid="metric-pressure-event">{metrics.metrics.pressureInjuryRate}%</div>
              <Typography.Text type="secondary">
                {metrics.metrics.fractions.pressureInjuryRate.numerator}/{metrics.metrics.fractions.pressureInjuryRate.denominator}
              </Typography.Text>
            </Col>
            <Col span={6}>
              <Typography.Text strong>跌倒发生率</Typography.Text>
              <div data-testid="metric-fall-event">{metrics.metrics.fallIncidentRate}%</div>
              <Typography.Text type="secondary">
                {metrics.metrics.fractions.fallIncidentRate.numerator}/{metrics.metrics.fractions.fallIncidentRate.denominator}
              </Typography.Text>
            </Col>
          </Row>
        ) : (
          <Spin />
        )}
      </Card>

      <Card size="small" title="登记结局/不良事件（护士）">
        <Row gutter={8}>
          <Col span={8}>
            <Input data-testid="evt-visit-id" placeholder="就诊 visitId" value={visitId} onChange={(e) => setVisitId(e.target.value)} />
          </Col>
          <Col span={8}>
            <Select
              style={{ width: '100%' }}
              data-testid="evt-type"
              value={eventType}
              onChange={(v) => setEventType(v)}
              options={[
                { value: 'pressure_injury_stage2', label: '二期压力性损伤' },
                { value: 'pressure_injury_stage3', label: '三期压力性损伤' },
                { value: 'pressure_injury_stage4', label: '四期压力性损伤' },
                { value: 'fall', label: '跌倒' },
              ]}
            />
          </Col>
          <Col span={6}>
            <Input data-testid="evt-desc" placeholder="事件描述" value={description} onChange={(e) => setDescription(e.target.value)} />
          </Col>
          <Col span={2}>
            <Button data-testid="evt-record-btn" type="primary" disabled={!canExecute} onClick={onRecord}>登记</Button>
          </Col>
        </Row>
      </Card>

      <Card size="small" title="结局事件记录">
        <Table
          size="small"
          rowKey="id"
          dataSource={events}
          pagination={false}
          columns={[
            { title: '就诊', dataIndex: 'visitId', ellipsis: true },
            { title: '类型', dataIndex: 'eventType' },
            { title: '描述', dataIndex: 'description' },
            { title: '发生时间', dataIndex: 'occurredAt' },
          ]}
        />
      </Card>
    </Space>
  );
}

/* ------------------------------------------------------------------ */
/* 页面                                                                */
/* ------------------------------------------------------------------ */
export default function NursingRiskPage() {
  const { dbUp, loadingHealth, checkHealth, error } = useNursingRiskStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      await checkHealth();
      setReady(true);
    })();
  }, [checkHealth]);

  return (
    <Watermark content={watermarkText}>
      <Layout className="min-h-screen bg-ink-bg">
        <Header className="flex items-center justify-between bg-jl-primary px-6 shadow-card">
          <div className="flex items-center gap-3">
            <SafetyCertificateOutlined className="text-2xl text-white" />
            <Typography.Title level={4} className="!mb-0 !text-white">
              压疮/跌倒风险预警
            </Typography.Title>
          </div>
          <Tag color={dbUp ? 'green' : 'red'} data-testid="risk-health-tag">
            {dbUp ? 'BFF/DB 正常 (up)' : 'BFF/DB 不可用'}
          </Tag>
        </Header>
        <Content className="p-4">
          <Spin spinning={!ready || loadingHealth}>
            {!dbUp ? (
              <Alert
                data-testid="risk-offline-alert"
                type="error"
                showIcon
                banner
                message="无法连接 BFF 或数据库，风险预警工作站不可用"
                description="请检查数据库服务；恢复后重新探活。系统不会以缓存或假数据冒充评估/预警结果。"
                action={
                  <button type="button" className="ant-btn ant-btn-default" onClick={() => void checkHealth()}>
                    重新探活
                  </button>
                }
              />
            ) : (
              <Tabs
                defaultActiveKey="assess"
                items={[
                  { key: 'assess', label: '评估登记', children: <AssessTab /> },
                  { key: 'board', label: '高危预警看板', children: <BoardTab /> },
                  { key: 'execute', label: '预防执行', children: <ExecuteTab /> },
                  { key: 'events', label: '结局与指标', children: <EventMetricsTab /> },
                ]}
              />
            )}
          </Spin>
          {error && dbUp && (
            <Alert data-testid="risk-error-alert" type="error" showIcon className="mt-3" message={error} />
          )}
        </Content>
      </Layout>
    </Watermark>
  );
}
