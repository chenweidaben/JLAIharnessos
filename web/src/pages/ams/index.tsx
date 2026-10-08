/**
 * 健澜科技 jlmedaios - 抗菌药物管理（AMS）工作站（M14-A）
 *
 * 对标国家《抗菌药物临床应用管理办法》：三级分级目录 + 医师处方权限 + 特殊使用级会诊审批 +
 * 围术期预防用药点评 + 专项点评 + 不合理用药看板 + DDD/AUD 八项质控指标。
 *
 * 医疗安全：AI 不自主开抗菌药；特殊使用级须会诊审批+签名；越权/禁忌由后端拦截；
 * 点评为规则建议，最终判定由药师/医师签名。健康门禁：BFF/DB 不可用显式 Alert + Watermark，不假数据。
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
  Input,
  Layout,
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
import { MedicineBoxOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { useAmsStore } from '@/store/amsStore';
import { useAuthStore } from '@/store/authStore';
import {
  ATC_LEVEL_LABEL,
  evaluatePerioperative,
  ISSUE_LABEL,
  PHARM_CLASS_LABEL,
} from '@/utils/amsRules';
import type {
  AmxCheckResult,
  AtcLevel,
  PharmClass,
  PrescriberGrant,
  SpecialApproval,
} from '@/types/ams';

const { Header, Content } = Layout;
const { RangePicker } = DatePicker;
const watermarkText = ['健澜科技', '抗菌药物管理', 'jlmedaios'];

/** 写操作 fire-and-forget：失败原因已写入 store.error 并由页面 Alert 展示；吞掉 rethrow。 */
function run(p: Promise<unknown>): void {
  void p.catch(() => undefined);
}

function fmtTime(v: string | null): string {
  return v ? dayjs(v).format('MM-DD HH:mm') : '-';
}

const LEVEL_COLOR: Record<AtcLevel, string> = {
  unrestricted: 'green',
  restricted: 'orange',
  special: 'red',
};

const APPROVAL_STATUS_META: Record<SpecialApproval['status'], { color: string; text: string }> = {
  pending: { color: 'gold', text: '待审批' },
  approved: { color: 'green', text: '已批准' },
  rejected: { color: 'red', text: '已驳回' },
};

/* ---------------------------------------------------------------------------
 * Tab 1：抗菌药目录 + 医师处方权限
 * ------------------------------------------------------------------------ */
function PermissionsTab() {
  const hasPerm = useAuthStore((s) => s.hasPermission);
  const { catalog, prescribers, loadPrescribers, grantPrescriber } = useAmsStore();

  const [prescriberId, setPrescriberId] = useState('');
  const [maxLevel, setMaxLevel] = useState<AtcLevel>('unrestricted');

  const onGrant = () => {
    if (prescriberId.trim()) run(grantPrescriber(prescriberId.trim(), maxLevel));
  };

  return (
    <Space direction="vertical" className="w-full" size="middle">
      <Card size="small" title="抗菌药分级目录（三级管理，WHO ATC/DDD）">
        <Table
          size="small"
          rowKey="id"
          dataSource={catalog}
          pagination={{ pageSize: 8 }}
          columns={[
            { title: '药品', dataIndex: 'genericName' },
            {
              title: '分级',
              dataIndex: 'atcLevel',
              render: (l: AtcLevel) => <Tag color={LEVEL_COLOR[l]}>{ATC_LEVEL_LABEL[l]}</Tag>,
            },
            {
              title: '药理分类',
              dataIndex: 'pharmClass',
              render: (c: PharmClass) => PHARM_CLASS_LABEL[c],
            },
            { title: 'DDD', dataIndex: 'ddd', render: (v: number) => `${v} g` },
          ]}
        />
      </Card>

      <Card size="small" title="医师抗菌药处方授权（住院=非限制 / 主治=限制 / 副高及以上=特殊，以授权为准）">
        <Space wrap className="mb-2">
          <Input
            placeholder="医师用户 UUID"
            value={prescriberId}
            onChange={(e) => setPrescriberId(e.target.value)}
            style={{ width: 240 }}
            data-testid="ams-grant-prescriber"
          />
          <Select
            value={maxLevel}
            style={{ width: 180 }}
            onChange={(v: AtcLevel) => setMaxLevel(v)}
            options={(Object.keys(ATC_LEVEL_LABEL) as AtcLevel[]).map((k) => ({
              value: k,
              label: ATC_LEVEL_LABEL[k],
            }))}
          />
          {hasPerm('ams:audit') ? (
            <Button type="primary" onClick={onGrant} data-testid="ams-grant-submit">
              授予/调整权限
            </Button>
          ) : (
            <Typography.Text type="secondary">当前角色无 ams:audit 权限，不可调整授权</Typography.Text>
          )}
          <Button onClick={() => void loadPrescribers()}>刷新授权</Button>
        </Space>
        <Table
          size="small"
          rowKey="id"
          dataSource={prescribers}
          pagination={{ pageSize: 8 }}
          columns={[
            {
              title: '医师',
              dataIndex: 'prescriberName',
              render: (v: string | null, r: PrescriberGrant) => v ?? r.prescriberId.slice(0, 8),
            },
            { title: '职称', dataIndex: 'title', render: (v: string | null) => v ?? '-' },
            {
              title: '最高可开分级',
              dataIndex: 'maxLevel',
              render: (l: AtcLevel) => <Tag color={LEVEL_COLOR[l]}>{ATC_LEVEL_LABEL[l]}</Tag>,
            },
            {
              title: '状态',
              dataIndex: 'status',
              render: (s: string) =>
                s === 'active' ? <Tag color="green">生效</Tag> : <Tag color="red">已撤销</Tag>,
            },
          ]}
        />
      </Card>
    </Space>
  );
}

/* ---------------------------------------------------------------------------
 * Tab 2：待审批特殊使用级
 * ------------------------------------------------------------------------ */
function SpecialApprovalTab() {
  const hasPerm = useAuthStore((s) => s.hasPermission);
  const { pendingApprovals, approveSpecial, rejectSpecial, createSpecialApproval } = useAmsStore();

  const [visitId, setVisitId] = useState('');
  const [drugId, setDrugId] = useState('');
  const [indication, setIndication] = useState('');
  const [opinion, setOpinion] = useState('');

  const onApply = () => {
    if (visitId.trim() && drugId.trim())
      run(createSpecialApproval({ visitId: visitId.trim(), drugId: drugId.trim(), indication: indication.trim() }));
  };

  return (
    <Space direction="vertical" className="w-full" size="middle">
      <Card size="small" title="申请特殊使用级抗菌药（未会诊审批不得进入医嘱/处方）">
        <Space wrap>
          <Input placeholder="就诊 UUID" value={visitId} onChange={(e) => setVisitId(e.target.value)} style={{ width: 200 }} data-testid="ams-apply-visit" />
          <Input placeholder="药品 UUID" value={drugId} onChange={(e) => setDrugId(e.target.value)} style={{ width: 200 }} data-testid="ams-apply-drug" />
          <Input.TextArea rows={1} placeholder="用药指征" value={indication} onChange={(e) => setIndication(e.target.value)} style={{ width: 280 }} />
          {hasPerm('ams:prescribe') ? (
            <Button type="primary" onClick={onApply} data-testid="ams-apply-submit">
              提交会诊申请
            </Button>
          ) : (
            <Typography.Text type="secondary">无 ams:prescribe 权限，不可开具特殊使用级</Typography.Text>
          )}
        </Space>
      </Card>

      <Card size="small" title="待审批（抗菌药物管理工作组会诊审批 + 电子签名）">
        <Table
          size="small"
          rowKey="id"
          dataSource={pendingApprovals}
          pagination={{ pageSize: 8 }}
          columns={[
            { title: '单号', dataIndex: 'approvalNo' },
            { title: '药品', dataIndex: 'drugName', render: (v: string | null) => v ?? '-' },
            { title: '指征', dataIndex: 'indication' },
            {
              title: '状态',
              dataIndex: 'status',
              render: (s: SpecialApproval['status']) => (
                <Tag color={APPROVAL_STATUS_META[s].color}>{APPROVAL_STATUS_META[s].text}</Tag>
              ),
            },
            { title: '申请时间', dataIndex: 'createdAt', render: (v: string) => fmtTime(v) },
            {
              title: '操作',
              key: 'actions',
              render: (_: unknown, row: SpecialApproval) =>
                row.status === 'pending' && hasPerm('ams:approve') ? (
                  <Space size={4}>
                    <Input
                      size="small"
                      placeholder="会诊意见"
                      value={opinion}
                      onChange={(e) => setOpinion(e.target.value)}
                      style={{ width: 180 }}
                      data-testid="ams-approve-opinion"
                    />
                    <Button
                      size="small"
                      type="primary"
                      data-testid="ams-approve-btn"
                      onClick={() => run(approveSpecial(row.id, opinion.trim() || '同意'))}
                    >
                      批准
                    </Button>
                    <Button
                      size="small"
                      danger
                      data-testid="ams-reject-btn"
                      onClick={() => run(rejectSpecial(row.id, '会诊不通过'))}
                    >
                      驳回
                    </Button>
                  </Space>
                ) : (
                  <Typography.Text type="secondary">-</Typography.Text>
                ),
            },
          ]}
        />
      </Card>
    </Space>
  );
}

/* ---------------------------------------------------------------------------
 * Tab 3：围术期预防用药点评（前端实时预检 + 后端 CDS）
 * ------------------------------------------------------------------------ */
function PerioperativeTab() {
  const hasPerm = useAuthStore((s) => s.hasPermission);
  const { createReview, checkRules } = useAmsStore();

  const [visitId, setVisitId] = useState('');
  const [incisionClass, setIncisionClass] = useState<'I' | 'II' | 'III' | 'IV'>('I');
  const [chosenClass, setChosenClass] = useState<PharmClass>('cephalosporin_1');
  const [chosenIsSpecial, setChosenIsSpecial] = useState(false);
  const [doseMinusIncisionMin, setDoseMinusIncisionMin] = useState(30);
  const [isCesarean, setIsCesarean] = useState(false);
  const [cordMinusDose, setCordMinusDose] = useState<number | null>(0);
  const [durationH, setDurationH] = useState(24);
  const [hasProlongReason, setHasProlongReason] = useState(false);
  const [serverCheck, setServerCheck] = useState<AmxCheckResult | null>(null);

  const live = evaluatePerioperative({
    incisionClass,
    chosenClass,
    chosenIsSpecial,
    doseMinusIncisionMin,
    isCesarean,
    cordClampMinusDoseMin: isCesarean ? cordMinusDose : null,
    durationH,
    hasProlongReason,
    anaerobicSite: false,
  });

  const onServerCheck = () => {
    void (async () => {
      try {
        const r = await checkRules({
          kind: 'perioperative',
          incisionClass,
          chosenClass,
          chosenIsSpecial,
          doseMinusIncisionMin,
          isCesarean,
          cordClampMinusDoseMin: isCesarean ? cordMinusDose : null,
          durationH,
          hasProlongReason,
        });
        setServerCheck(r);
      } catch {
        /* 错误已入 store.error，由 Alert 展示 */
      }
    })();
  };

  const onSubmit = () => {
    if (visitId.trim())
      run(
        createReview({
          reviewType: 'perioperative',
          visitId: visitId.trim(),
          incisionClass,
          chosenClass,
          durationH,
        }),
      );
  };

  return (
    <Space direction="vertical" className="w-full" size="middle">
      <Card size="small" title="围术期预防用药合理性（前端实时预检；后端规则预检不入库）">
        <Space wrap>
          <Input placeholder="就诊 UUID" value={visitId} onChange={(e) => setVisitId(e.target.value)} style={{ width: 200 }} data-testid="ams-peri-visit" />
          <Select
            value={incisionClass}
            style={{ width: 120 }}
            onChange={(v) => setIncisionClass(v as 'I' | 'II' | 'III' | 'IV')}
            options={['I', 'II', 'III', 'IV'].map((k) => ({ value: k, label: `${k} 类切口` }))}
          />
          <Select
            value={chosenClass}
            style={{ width: 180 }}
            onChange={(v) => setChosenClass(v as PharmClass)}
            options={(Object.keys(PHARM_CLASS_LABEL) as PharmClass[]).map((k) => ({
              value: k,
              label: PHARM_CLASS_LABEL[k],
            }))}
          />
          <Select
            value={chosenIsSpecial ? 'special' : 'normal'}
            style={{ width: 140 }}
            onChange={(v) => setChosenIsSpecial(v === 'special')}
            options={[
              { value: 'normal', label: '非特殊使用级' },
              { value: 'special', label: '特殊使用级' },
            ]}
          />
          <span>切皮前给药(min)：</span>
          <Input
            type="number"
            value={doseMinusIncisionMin}
            onChange={(e) => setDoseMinusIncisionMin(Number(e.target.value))}
            style={{ width: 90 }}
            data-testid="ams-peri-timing"
          />
          <span>疗程(h)：</span>
          <Input
            type="number"
            value={durationH}
            onChange={(e) => setDurationH(Number(e.target.value))}
            style={{ width: 90 }}
            data-testid="ams-peri-duration"
          />
          <Checkbox checked={isCesarean} onChange={(e) => setIsCesarean(e.target.checked)} data-testid="ams-peri-cesarean">
            剖宫产
          </Checkbox>
          <Checkbox checked={hasProlongReason} onChange={(e) => setHasProlongReason(e.target.checked)} data-testid="ams-peri-prolong">
            有延长用药依据
          </Checkbox>
          {isCesarean && (
            <>
              <span>断脐后给药(min)：</span>
              <Input
                type="number"
                value={cordMinusDose ?? 0}
                onChange={(e) => setCordMinusDose(Number(e.target.value))}
                style={{ width: 90 }}
                data-testid="ams-peri-cord"
              />
            </>
          )}
        </Space>

        <Descriptions size="small" column={2} className="mt-2">
          <Descriptions.Item label="实时判定">
            <Tag color={live.rational ? 'green' : 'red'} data-testid="ams-peri-live">
              {live.rational ? '合理' : '不合理'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="问题">
            {live.issues.length === 0 ? (
              '-'
            ) : (
              live.issues.map((i) => (
                <Tag key={i} color="orange" data-testid="ams-peri-issue">
                  {ISSUE_LABEL[i]}
                </Tag>
              ))
            )}
          </Descriptions.Item>
        </Descriptions>

        <Space wrap className="mt-2">
          <Button onClick={onServerCheck} data-testid="ams-peri-server-check">
            后端规则预检(CDS)
          </Button>
          {hasPerm('ams:review') ? (
            <Button type="primary" onClick={onSubmit} data-testid="ams-peri-submit">
              生成围术期点评
            </Button>
          ) : (
            <Typography.Text type="secondary">无 ams:review 权限，不可点评</Typography.Text>
          )}
        </Space>

        {serverCheck && (
          <Alert
            className="mt-2"
            type={serverCheck.rational ? 'success' : 'warning'}
            showIcon
            data-testid="ams-peri-server-result"
            message={`后端 CDS 预检：${serverCheck.rational ? '合理' : '不合理'}`}
            description={
              serverCheck.issues.length > 0
                ? serverCheck.issues.map((i) => ISSUE_LABEL[i]).join('、')
                : undefined
            }
          />
        )}
      </Card>
    </Space>
  );
}

/* ---------------------------------------------------------------------------
 * Tab 4：专项点评（列表 + 签名/退回）
 * ------------------------------------------------------------------------ */
function ReviewsTab() {
  const hasPerm = useAuthStore((s) => s.hasPermission);
  const { reviews, signReview, returnReview } = useAmsStore();

  return (
    <Card size="small" title="门诊处方 / 住院医嘱抗菌药专项点评（AI 仅建议，药师/医师签名生效）">
      <Table
        size="small"
        rowKey="id"
        dataSource={reviews}
        pagination={{ pageSize: 8 }}
        columns={[
          { title: '点评单号', dataIndex: 'reviewNo' },
          { title: '类型', dataIndex: 'reviewType', render: (t: string) => (t === 'perioperative' ? '围术期' : t === 'prescription' ? '门诊处方' : '住院医嘱') },
          {
            title: '结论',
            dataIndex: 'result',
            render: (r: string) =>
              r === 'rational' ? <Tag color="green">合理</Tag> : <Tag color="red">不合理</Tag>,
          },
          {
            title: '问题类型',
            dataIndex: 'issueTypes',
            render: (issues: import('@/types/ams').AmxIssueCode[]) =>
              issues.length === 0 ? (
                '-'
              ) : (
                issues.map((i) => (
                  <Tag key={i} color="orange">
                    {ISSUE_LABEL[i]}
                  </Tag>
                ))
              ),
          },
          {
            title: '状态',
            dataIndex: 'status',
            render: (s: string) =>
              s === 'signed' ? <Tag color="blue">已签名</Tag> : s === 'returned' ? <Tag color="default">已退回</Tag> : <Tag color="gold">待审</Tag>,
          },
          {
            title: '操作',
            key: 'actions',
            render: (_: unknown, row: import('@/types/ams').AmxReview) =>
              row.status === 'pending_review' && hasPerm('ams:review') ? (
                <Space size={4}>
                  <Button size="small" type="primary" data-testid="ams-sign-btn" onClick={() => run(signReview(row.id))}>
                    签名确认
                  </Button>
                  <Button size="small" danger data-testid="ams-return-btn" onClick={() => run(returnReview(row.id, '需复核'))}>
                    退回
                  </Button>
                </Space>
              ) : (
                <Typography.Text type="secondary">-</Typography.Text>
              ),
          },
        ]}
      />
    </Card>
  );
}

/* ---------------------------------------------------------------------------
 * Tab 5：不合理用药看板（建议性预警，非阻断）
 * ------------------------------------------------------------------------ */
function IrrationalTab() {
  const { irrationalReviews } = useAmsStore();
  return (
    <Card size="small" title="不合理用药看板（建议性预警；越权/禁忌/特殊未审批为硬拦截）">
      <Table
        size="small"
        rowKey="id"
        dataSource={irrationalReviews}
        pagination={{ pageSize: 8 }}
        columns={[
          { title: '点评单号', dataIndex: 'reviewNo' },
          { title: '就诊', dataIndex: 'visitId', render: (v: string) => v.slice(0, 8) },
          {
            title: '问题类型',
            dataIndex: 'issueTypes',
            render: (issues: import('@/types/ams').AmxIssueCode[]) =>
              issues.map((i) => (
                <Tag key={i} color="red">
                  {ISSUE_LABEL[i]}
                </Tag>
              )),
          },
          { title: '点评时间', dataIndex: 'reviewedAt', render: (v: string | null) => fmtTime(v) },
        ]}
      />
    </Card>
  );
}

/* ---------------------------------------------------------------------------
 * Tab 6：质控指标（含分子分母）
 * ------------------------------------------------------------------------ */
type NumericMetricKey =
  | 'outpatientAbxRate'
  | 'inpatientAbxRate'
  | 'aud'
  | 'classIProphylaxisRate'
  | 'timingAppropriateRate'
  | 'durationComplianceRate'
  | 'specialShare'
  | 'cultureRate';

const METRIC_GOALS: { key: NumericMetricKey; title: string }[] = [
  { key: 'outpatientAbxRate', title: '门诊抗菌药处方比例(%)' },
  { key: 'inpatientAbxRate', title: '住院抗菌药使用率(%)' },
  { key: 'aud', title: '抗菌药使用强度 AUD(DDDs/100人天)' },
  { key: 'classIProphylaxisRate', title: 'I 类切口预防用药率(%)' },
  { key: 'timingAppropriateRate', title: '围术期时机合理率(%)' },
  { key: 'durationComplianceRate', title: '围术期疗程合格率(%)' },
  { key: 'specialShare', title: '特殊使用级占比(%)' },
  { key: 'cultureRate', title: '治疗性使用微生物送检率(%)' },
];

function MetricsTab() {
  const { metrics, loadMetrics } = useAmsStore();
  const [range, setRange] = useState<[Dayjs, Dayjs]>([dayjs().startOf('month'), dayjs()]);
  const m = metrics?.metrics;

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
          <Button type="primary" onClick={onLoad} data-testid="ams-metrics-load">
            加载质控指标
          </Button>
        </Space>
      </Card>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        {METRIC_GOALS.map((g) => (
          <Card key={g.key} size="small">
            <Statistic title={g.title} value={m?.[g.key] ?? 0} precision={2} />
          </Card>
        ))}
      </div>
      {m && (
        <Card size="small" title="分子/分母（可核查）">
          <Table
            size="small"
            pagination={false}
            rowKey="key"
            dataSource={METRIC_GOALS.map((g) => ({
              key: g.key,
              name: g.title,
              numerator: m.fractions[g.key].numerator,
              denominator: m.fractions[g.key].denominator,
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
export default function AmsPage() {
  const { dbUp, healthChecking, checkHealth, loadCatalog, loadPrescribers, loadPendingApprovals, error } =
    useAmsStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      const up = await checkHealth();
      if (up) {
        await Promise.all([loadCatalog(), loadPrescribers(), loadPendingApprovals()]);
      }
      setReady(true);
    })();
  }, [checkHealth, loadCatalog, loadPrescribers, loadPendingApprovals]);

  const onRefresh = async () => {
    const up = await checkHealth();
    if (up) await Promise.all([loadCatalog(), loadPrescribers(), loadPendingApprovals()]);
  };

  return (
    <Watermark content={watermarkText}>
      <Layout className="min-h-screen bg-ink-bg">
        <Header className="flex items-center justify-between bg-jl-primary px-6 shadow-card">
          <div className="flex items-center gap-3">
            <MedicineBoxOutlined className="text-2xl text-white" />
            <Typography.Title level={4} className="!mb-0 !text-white">
              抗菌药物管理（AMS）
            </Typography.Title>
            <span className="hidden text-sm text-white/70 md:block">
              三级分级 · 处方权限 · 特殊使用级审批 · 围术期/专项点评 · AUD 质控
            </span>
          </div>
          <Tag color={dbUp ? 'green' : 'red'} data-testid="ams-health-tag">
            {dbUp ? 'BFF/DB 正常 (up)' : 'BFF/DB 不可用'}
          </Tag>
        </Header>
        <Content className="p-4">
          <DemoModeBanner />
          <Spin spinning={!ready || healthChecking}>
            {!dbUp ? (
              <Alert
                data-testid="ams-offline-alert"
                type="error"
                showIcon
                banner
                message="无法连接 BFF 或数据库，抗菌药物管理工作站不可用"
                description="请检查数据库服务；恢复后点击刷新重新探活。系统不会以缓存或假数据冒充分级/审批/点评/质控结果。"
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
                defaultActiveKey="permissions"
                items={[
                  { key: 'permissions', label: '处方权限', children: <PermissionsTab /> },
                  { key: 'special', label: '待审批特殊使用级', children: <SpecialApprovalTab /> },
                  { key: 'perioperative', label: '围术期点评', children: <PerioperativeTab /> },
                  { key: 'reviews', label: '专项点评', children: <ReviewsTab /> },
                  { key: 'irrational', label: '不合理用药看板', children: <IrrationalTab /> },
                  { key: 'metrics', label: '质控指标', children: <MetricsTab /> },
                ]}
              />
            )}
          </Spin>
          {error && dbUp && (
            <Alert data-testid="ams-error-alert" type="error" showIcon className="mt-3" message={error} />
          )}
        </Content>
      </Layout>
    </Watermark>
  );
}
