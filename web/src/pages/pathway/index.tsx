/**
 * 健澜科技 jlmedaios - 临床路径管理工作站（M15-A）
 *
 * 对标国家《临床路径管理指导原则》、电子病历五级、三甲评审：
 * 结构化路径定义（按天/阶段标准医嘱表单）+ 可入径患者评估/医师签名入径 + 路径执行（一键下达走真实医嘱，
 * 执行人本人签名）+ 正/负变异管理 + 退出/完成出径 + 出院标准逐项核对 + 质控指标（分子分母）。
 *
 * 医疗安全：AI 不自主开医嘱/诊断；标准医嘱仅为待确认清单；入径/退出/完成出径须有资质医师（pathway:manage）
 * 电子签名；路径仅为规范辅助，不替代医师判断。健康门禁：BFF/DB 不可用显式 Alert + Watermark，不假数据。
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
  Modal,
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
import { SolutionOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePathwayStore } from '@/store/pathwayStore';
import { useAuthStore } from '@/store/authStore';
import {
  classifyVariation,
  currentStageDay,
  ENROLLMENT_STATUS_LABEL,
  EXECUTION_STATUS_LABEL,
  ITEM_TYPE_LABEL,
  negativeVariationSuggestsWithdraw,
  VARIATION_CATEGORY_LABEL,
} from '@/utils/pathwayRules';
import type {
  EligiblePatient,
  PathwayDefinition,
  VariationCategory,
} from '@/types/pathway';

const { Header, Content } = Layout;
const { RangePicker } = DatePicker;
const watermarkText = ['健澜科技', '临床路径管理', 'jlmedaios'];

/** 写操作 fire-and-forget：失败原因已写入 store.error 并由页面 Alert 展示；吞掉 rethrow。 */
function run(p: Promise<unknown>): void {
  void p.catch(() => undefined);
}

function fmtTime(v: string | null): string {
  return v ? dayjs(v).format('MM-DD HH:mm') : '-';
}

/* ---------------------------------------------------------------------------
 * Tab 1：路径定义管理
 * ------------------------------------------------------------------------ */
function DefinitionsTab() {
  const { definitions } = usePathwayStore();
  return (
    <Card size="small" title="临床路径定义（结构化：入径/排除/出院标准 + 按天表单；active 生效）">
      <Table
        size="small"
        rowKey="id"
        dataSource={definitions}
        pagination={{ pageSize: 8 }}
        expandable={{
          expandedRowRender: (r) => (
            <Space direction="vertical" size={0}>
              <Typography.Text>
                <b>入径标准：</b>
                {r.inclusionCriteria.join('；') || '-'}
              </Typography.Text>
              <Typography.Text type="danger">
                <b>排除标准：</b>
                {r.exclusionCriteria.join('；') || '-'}
              </Typography.Text>
              <Typography.Text type="success">
                <b>出院标准：</b>
                {r.dischargeCriteria.join('；') || '-'}
              </Typography.Text>
            </Space>
          ),
        }}
        columns={[
          { title: '编码', dataIndex: 'pathwayCode' },
          { title: '路径名称', dataIndex: 'name' },
          { title: 'ICD', dataIndex: 'icdCode', render: (v: string | null) => v ?? '-' },
          {
            title: '标准住院日',
            dataIndex: 'standardLos',
            render: (v: number | null) => (v == null ? '-' : `${v} 天`),
          },
          { title: '版本', dataIndex: 'version' },
          {
            title: '状态',
            dataIndex: 'status',
            render: (s: string) =>
              s === 'active' ? <Tag color="green">生效</Tag> : <Tag>停用</Tag>,
          },
        ]}
      />
    </Card>
  );
}

/* ---------------------------------------------------------------------------
 * Tab 2：可入径患者 / 医师签名入径
 * ------------------------------------------------------------------------ */
function EligibleTab() {
  const hasPerm = useAuthStore((s) => s.hasPermission);
  const { eligible, definitions, enroll } = usePathwayStore();

  const [selected, setSelected] = useState<EligiblePatient | null>(null);
  const [confirmedInclusion, setConfirmedInclusion] = useState<string[]>([]);
  const [confirmedExclusion, setConfirmedExclusion] = useState<string[]>([]);

  const def: PathwayDefinition | undefined = useMemo(
    () => definitions.find((d) => d.id === selected?.pathwayId),
    [definitions, selected],
  );

  const openEnroll = (row: EligiblePatient) => {
    setSelected(row);
    const d = definitions.find((x) => x.id === row.pathwayId);
    setConfirmedInclusion(d?.inclusionCriteria ?? []);
    setConfirmedExclusion([]);
  };

  const onConfirm = () => {
    if (!selected) return;
    run(
      enroll({
        visitId: selected.visitId,
        pathwayId: selected.pathwayId,
        confirmedInclusion,
        confirmedExclusion,
      }),
    );
    setSelected(null);
  };

  return (
    <Space direction="vertical" className="w-full" size="middle">
      <Card size="small" title="可入径住院患者（在院 + 诊断 ICD 命中 active 路径 + 未入径；医师评估并电子签名入径）">
        <Table
          size="small"
          rowKey="visitId"
          dataSource={eligible}
          pagination={{ pageSize: 8 }}
          columns={[
            { title: '患者', dataIndex: 'patientName', render: (v: string | null) => v ?? '-' },
            { title: '就诊', dataIndex: 'visitId', render: (v: string) => v.slice(0, 8) },
            { title: '入院诊断', dataIndex: 'diagnosis' },
            { title: '诊断码', dataIndex: 'diagnosisCode', render: (v: string | null) => v ?? '-' },
            { title: '匹配路径', dataIndex: 'pathwayName' },
            {
              title: '操作',
              key: 'actions',
              render: (_: unknown, row: EligiblePatient) =>
                hasPerm('pathway:manage') ? (
                  <Button
                    size="small"
                    type="primary"
                    data-testid="pathway-enroll-btn"
                    onClick={() => openEnroll(row)}
                  >
                    评估入径
                  </Button>
                ) : (
                  <Typography.Text type="secondary">无 pathway:manage 权限</Typography.Text>
                ),
            },
          ]}
        />
      </Card>

      <Modal
        open={!!selected}
        title="入径评估（医师电子签名确认）"
        onCancel={() => setSelected(null)}
        onOk={onConfirm}
        okText="确认入径（本人签名）"
      >
        {selected && (
          <Space direction="vertical" className="w-full">
            <Descriptions size="small" column={1}>
              <Descriptions.Item label="患者">{selected.patientName ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="入径诊断">{selected.diagnosis}</Descriptions.Item>
              <Descriptions.Item label="路径">{selected.pathwayName}</Descriptions.Item>
            </Descriptions>
            <Typography.Text strong>入径标准逐项确认：</Typography.Text>
            <Checkbox.Group
              style={{ display: 'flex', flexDirection: 'column' }}
              value={confirmedInclusion}
              options={(def?.inclusionCriteria ?? []).map((c) => ({ label: c, value: c }))}
              onChange={(v) => setConfirmedInclusion(v)}
            />
            <Typography.Text type="danger">排除项（命中任一不得入径）：</Typography.Text>
            <Checkbox.Group
              style={{ display: 'flex', flexDirection: 'column' }}
              value={confirmedExclusion}
              options={(def?.exclusionCriteria ?? []).map((c) => ({ label: c, value: c }))}
              onChange={(v) => setConfirmedExclusion(v)}
            />
          </Space>
        )}
      </Modal>
    </Space>
  );
}

/* ---------------------------------------------------------------------------
 * Tab 3：路径执行表单（一键下达 = 执行人本人签名真实医嘱）
 * ------------------------------------------------------------------------ */
function WorkTab() {
  const hasPerm = useAuthStore((s) => s.hasPermission);
  const { enrollments, detail, selectEnrollment, executeFormItem, skipFormItem } =
    usePathwayStore();

  const inPath = enrollments.filter((e) => e.status === 'in_path');
  const execMap = useMemo(() => {
    const m = new Map<string, string>();
    detail?.executions.forEach((ex) => m.set(ex.formItemId, ex.status));
    return m;
  }, [detail]);

  const currentDay = detail ? currentStageDay(detail.enrollment.enrolledAt) : 1;

  return (
    <Space direction="vertical" className="w-full" size="middle">
      <Card size="small" title="选择在径患者（路径执行 / 变异 / 退出 / 出径）">
        <Select
          style={{ width: 420 }}
          placeholder="选择在径入径记录"
          value={detail?.enrollment.id}
          onChange={(id: string) => run(selectEnrollment(id))}
          options={inPath.map((e) => ({
            value: e.id,
            label: `${e.enrollmentNo} · ${e.patientName ?? e.patientId.slice(0, 8)} · ${e.enrollmentDiagnosis}`,
          }))}
        />
      </Card>

      {detail && (
        <>
          <Card size="small" title="入径概况">
            <Descriptions size="small" column={3}>
              <Descriptions.Item label="入径单号">{detail.enrollment.enrollmentNo}</Descriptions.Item>
              <Descriptions.Item label="当前住院日">
                第 {currentDay} 天
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={detail.enrollment.status === 'in_path' ? 'blue' : detail.enrollment.status === 'completed' ? 'green' : 'red'}>
                  {ENROLLMENT_STATUS_LABEL[detail.enrollment.status]}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card size="small" title="路径表单（标准医嘱/项目；一键下达 = 执行人本人电子签名，AI 不自主开方）">
            <Table
              size="small"
              rowKey="id"
              dataSource={detail.forms}
              pagination={false}
              columns={[
                { title: '天', dataIndex: 'stageDay', width: 60 },
                { title: '阶段', dataIndex: 'stageName' },
                {
                  title: '类型',
                  dataIndex: 'itemType',
                  render: (t: string) => <Tag>{ITEM_TYPE_LABEL[t as keyof typeof ITEM_TYPE_LABEL]}</Tag>,
                },
                { title: '内容', dataIndex: 'content' },
                {
                  title: '必选',
                  dataIndex: 'required',
                  render: (r: boolean) => (r ? <Tag color="red">必选</Tag> : <Tag>可选</Tag>),
                },
                {
                  title: '执行状态',
                  key: 'status',
                  render: (_: unknown, row: { id: string }) => {
                    const st = execMap.get(row.id) ?? 'pending';
                    return (
                      <Tag color={st === 'executed' ? 'green' : st === 'pending' ? 'default' : 'orange'}>
                        {EXECUTION_STATUS_LABEL[st]}
                      </Tag>
                    );
                  },
                },
                {
                  title: '操作',
                  key: 'actions',
                  render: (_: unknown, row: { id: string }) => {
                    const st = execMap.get(row.id) ?? 'pending';
                    if (st !== 'pending') return <Typography.Text type="secondary">-</Typography.Text>;
                    return hasPerm('pathway:execute') ? (
                      <Space size={4}>
                        <Button
                          size="small"
                          type="primary"
                          data-testid="pathway-execute-btn"
                          onClick={() => run(executeFormItem(detail.enrollment.id, row.id))}
                        >
                          下达(签名)
                        </Button>
                        <Button
                          size="small"
                          data-testid="pathway-skip-btn"
                          onClick={() =>
                            run(skipFormItem(detail.enrollment.id, { formItemId: row.id, status: 'skipped', note: '按医师判断不执行' }))
                          }
                        >
                          跳过
                        </Button>
                      </Space>
                    ) : (
                      <Typography.Text type="secondary">无 pathway:execute 权限</Typography.Text>
                    );
                  },
                },
              ]}
            />
          </Card>
        </>
      )}
    </Space>
  );
}

/* ---------------------------------------------------------------------------
 * Tab 4：变异记录
 * ------------------------------------------------------------------------ */
function VariationTab() {
  const hasPerm = useAuthStore((s) => s.hasPermission);
  const { detail, recordVariation } = usePathwayStore();

  const [category, setCategory] = useState<VariationCategory>('complication');
  const [description, setDescription] = useState('');

  if (!detail) {
    return (
      <Card size="small">
        <Typography.Text type="secondary">请先在"路径执行"页选择在径患者。</Typography.Text>
      </Card>
    );
  }

  const onRecord = () => {
    if (!description.trim()) return;
    run(
      recordVariation(detail.enrollment.id, {
        category,
        description: description.trim(),
        stageDay: currentStageDay(detail.enrollment.enrolledAt),
      }),
    );
    setDescription('');
  };

  const suggestsWithdraw = negativeVariationSuggestsWithdraw(category);

  return (
    <Space direction="vertical" className="w-full" size="middle">
      <Card size="small" title="记录变异（正性=提前达到出院标准；负性=并发症/耐药/检查异常/患者原因/诊断修正）">
        <Space wrap>
          <Select
            value={category}
            style={{ width: 200 }}
            onChange={(v: VariationCategory) => setCategory(v)}
            options={(Object.keys(VARIATION_CATEGORY_LABEL) as VariationCategory[]).map((k) => ({
              value: k,
              label: VARIATION_CATEGORY_LABEL[k],
            }))}
          />
          <Input.TextArea
            rows={1}
            placeholder="变异说明"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ width: 320 }}
            data-testid="pathway-variation-desc"
          />
          {hasPerm('pathway:manage') ? (
            <Button type="primary" onClick={onRecord} data-testid="pathway-variation-submit">
              记录变异
            </Button>
          ) : (
            <Typography.Text type="secondary">无 pathway:manage 权限</Typography.Text>
          )}
        </Space>
        <Alert
          className="mt-2"
          type={classifyVariation(category) === 'positive' ? 'success' : 'warning'}
          showIcon
          message={
            classifyVariation(category) === 'positive'
              ? `正性变异：${VARIATION_CATEGORY_LABEL[category]}`
              : `负性变异：${VARIATION_CATEGORY_LABEL[category]}${suggestsWithdraw ? '（达到退出条件，建议退出路径）' : ''}`
          }
        />
      </Card>

      <Card size="small" title="变异记录列表">
        <Table
          size="small"
          rowKey="id"
          dataSource={detail.variations}
          pagination={false}
          columns={[
            { title: '变异单号', dataIndex: 'variationNo' },
            { title: '天', dataIndex: 'stageDay', render: (v: number | null) => v ?? '-' },
            {
              title: '方向',
              dataIndex: 'variationType',
              render: (t: string) =>
                t === 'positive' ? <Tag color="green">正性</Tag> : <Tag color="red">负性</Tag>,
            },
            {
              title: '原因',
              dataIndex: 'category',
              render: (c: VariationCategory) => VARIATION_CATEGORY_LABEL[c],
            },
            { title: '说明', dataIndex: 'description' },
            { title: '记录时间', dataIndex: 'recordedAt', render: (v: string) => fmtTime(v) },
          ]}
        />
      </Card>
    </Space>
  );
}

/* ---------------------------------------------------------------------------
 * Tab 5：出径评估（出院标准逐项核对）+ 退出
 * ------------------------------------------------------------------------ */
function DischargeTab() {
  const hasPerm = useAuthStore((s) => s.hasPermission);
  const { detail, definitions, withdraw, complete } = usePathwayStore();

  const [confirmedDischarge, setConfirmedDischarge] = useState<string[]>([]);
  const [reason, setReason] = useState('');

  if (!detail) {
    return (
      <Card size="small">
        <Typography.Text type="secondary">请先在"路径执行"页选择在径患者。</Typography.Text>
      </Card>
    );
  }

  const def = definitions.find((d) => d.id === detail.enrollment.pathwayId);
  const criteria = def?.dischargeCriteria ?? [];

  const onComplete = () => {
    run(complete(detail.enrollment.id, confirmedDischarge));
  };
  const onWithdraw = () => {
    if (!reason.trim()) return;
    run(withdraw(detail.enrollment.id, reason.trim()));
  };

  return (
    <Space direction="vertical" className="w-full" size="middle">
      <Card size="small" title="出径评估：出院标准逐项核对（全部满足方可完成出径；否则后端 409 列出未满足项）">
        <Checkbox.Group
          style={{ display: 'flex', flexDirection: 'column' }}
          value={confirmedDischarge}
          options={criteria.map((c) => ({ label: c, value: c }))}
          onChange={(v) => setConfirmedDischarge(v)}
        />
        <div className="mt-2">
          {hasPerm('pathway:manage') ? (
            <Button type="primary" onClick={onComplete} data-testid="pathway-complete-btn">
              完成出径（本人签名）
            </Button>
          ) : (
            <Typography.Text type="secondary">无 pathway:manage 权限，不可完成出径</Typography.Text>
          )}
        </div>
      </Card>

      <Card size="small" title="退出路径（变异/并发症/诊断修正/患者原因；电子签名）">
        <Space wrap>
          <Input
            placeholder="退出原因"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={{ width: 320 }}
            data-testid="pathway-withdraw-reason"
          />
          {hasPerm('pathway:manage') ? (
            <Button danger onClick={onWithdraw} data-testid="pathway-withdraw-btn">
              退出路径（本人签名）
            </Button>
          ) : (
            <Typography.Text type="secondary">无 pathway:manage 权限</Typography.Text>
          )}
        </Space>
      </Card>
    </Space>
  );
}

/* ---------------------------------------------------------------------------
 * Tab 6：质控指标（含分子分母）
 * ------------------------------------------------------------------------ */
function MetricsTab() {
  const { metrics, loadMetrics } = usePathwayStore();
  const [range, setRange] = useState<[Dayjs, Dayjs]>([dayjs().startOf('month'), dayjs()]);

  const rows: { key: string; name: string; fraction?: { numerator: number; denominator: number; rate: number | null } }[] = [
    { key: 'enrollmentRate', name: '临床路径入径率(%)', fraction: metrics?.enrollmentRate },
    { key: 'completionRate', name: '路径完成率(%)', fraction: metrics?.completionRate },
    { key: 'variationRate', name: '变异率(%)', fraction: metrics?.variationRate },
    { key: 'withdrawalRate', name: '退出率(%)', fraction: metrics?.withdrawalRate },
  ];

  const onLoad = () => void loadMetrics(range[0].toISOString(), range[1].toISOString());

  return (
    <Space direction="vertical" className="w-full" size="middle">
      <Card size="small">
        <Space wrap>
          <RangePicker
            showTime
            value={range}
            onChange={(v) => v && v[0] && v[1] && setRange([v[0], v[1]])}
          />
          <Button type="primary" onClick={onLoad} data-testid="pathway-metrics-load">
            加载质控指标
          </Button>
        </Space>
      </Card>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        {rows.map((r) => (
          <Card key={r.key} size="small">
            <Statistic title={r.name} value={r.fraction?.rate ?? 0} precision={2} />
          </Card>
        ))}
        <Card size="small">
          <Statistic title="完成患者平均住院日(天)" value={metrics?.avgLos ?? 0} precision={2} />
        </Card>
        <Card size="small">
          <Statistic title="完成患者平均住院费用(元)" value={metrics?.avgFee ?? 0} precision={2} />
        </Card>
      </div>
      {metrics && (
        <Card size="small" title="分子/分母（可核查）">
          <Table
            size="small"
            pagination={false}
            rowKey="key"
            dataSource={rows}
            columns={[
              { title: '指标', dataIndex: 'name' },
              { title: '分子', key: 'num', render: (_: unknown, r: (typeof rows)[number]) => r.fraction?.numerator ?? 0 },
              { title: '分母', key: 'den', render: (_: unknown, r: (typeof rows)[number]) => r.fraction?.denominator ?? 0 },
              { title: '率(%)', key: 'rate', render: (_: unknown, r: (typeof rows)[number]) => r.fraction?.rate ?? '-' },
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
export default function PathwayPage() {
  const { dbUp, healthChecking, checkHealth, loadDefinitions, loadEligible, loadEnrollments, error } =
    usePathwayStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      const up = await checkHealth();
      if (up) {
        await Promise.all([loadDefinitions(), loadEligible(), loadEnrollments()]);
      }
      setReady(true);
    })();
  }, [checkHealth, loadDefinitions, loadEligible, loadEnrollments]);

  const onRefresh = async () => {
    const up = await checkHealth();
    if (up) await Promise.all([loadDefinitions(), loadEligible(), loadEnrollments()]);
  };

  return (
    <Watermark content={watermarkText}>
      <Layout className="min-h-screen bg-ink-bg">
        <Header className="flex items-center justify-between bg-jl-primary px-6 shadow-card">
          <div className="flex items-center gap-3">
            <SolutionOutlined className="text-2xl text-white" />
            <Typography.Title level={4} className="!mb-0 !text-white">
              临床路径管理
            </Typography.Title>
            <span className="hidden text-sm text-white/70 md:block">
              结构化路径表单 · 入径签名 · 路径执行 · 变异管理 · 出径核对 · 质控指标
            </span>
          </div>
          <Tag color={dbUp ? 'green' : 'red'} data-testid="pathway-health-tag">
            {dbUp ? 'BFF/DB 正常 (up)' : 'BFF/DB 不可用'}
          </Tag>
        </Header>
        <Content className="p-4">
          <DemoModeBanner />
          <Spin spinning={!ready || healthChecking}>
            {!dbUp ? (
              <Alert
                data-testid="pathway-offline-alert"
                type="error"
                showIcon
                banner
                message="无法连接 BFF 或数据库，临床路径管理工作站不可用"
                description="请检查数据库服务；恢复后点击刷新重新探活。系统不会以缓存或假数据冒充路径定义/入径/执行/变异/出径/质控结果。"
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
                defaultActiveKey="definitions"
                items={[
                  { key: 'definitions', label: '路径定义', children: <DefinitionsTab /> },
                  { key: 'eligible', label: '可入径/入径', children: <EligibleTab /> },
                  { key: 'work', label: '路径执行', children: <WorkTab /> },
                  { key: 'variation', label: '变异记录', children: <VariationTab /> },
                  { key: 'discharge', label: '出径评估', children: <DischargeTab /> },
                  { key: 'metrics', label: '质控指标', children: <MetricsTab /> },
                ]}
              />
            )}
          </Spin>
          {error && dbUp && (
            <Alert data-testid="pathway-error-alert" type="error" showIcon className="mt-3" message={error} />
          )}
        </Content>
      </Layout>
    </Watermark>
  );
}
