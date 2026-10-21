/**
 * 健澜科技 jlmedaios - 疼痛 NRS 0–10 评估（M521-B，P0 首批）
 *
 * 三甲流程：患者/就诊 Select 远程搜索带出姓名/性别/年龄/床号/诊断 → 评估类型
 * /部位/疼痛性质结构化选择 → NRS 0–10 Radio.Group 实时分级预览 → 触发/缓解因素与
 * 备注聚合进 note → ≥4 分自动通知医师闭环并展示干预待办标识。
 * 历史 antd Table + 状态 Tag；BFF 不可用由 store/service 降级确定性 DEMO 并打标。
 *
 * 权限码：pain:assess（登记）/ pain:view（查看历史）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  Modal,
  Radio,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { HeartFilled } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { usePermission } from '@/router/guards';
import { useAuthStore } from '@/store/authStore';
import { usePainAssessmentFormStore } from '@/store/painAssessmentFormStore';
import {
  searchVisits,
  type VisitOption,
} from '@/services/api/clinicalDict';
import {
  ASSESS_TYPE_LABEL,
  LOCATION_LABEL,
  LEVEL_LABEL,
  LEVEL_COLOR,
  LEVEL_BAR_COLOR,
  PAIN_NATURE_OPTIONS,
  classifyPainLevel,
  isNeedAnalgesia,
  resolveReassessHours,
  resolveAdvice,
  type AssessType,
  type PainLocation,
  type PainLevel,
  type PainAssessmentRecord,
  type PainAssessmentSubmitInput,
} from '@/services/api/painAssessmentForm';

const { TextArea } = Input;

/** NRS 每档文字说明：0 无痛 / 1–3 轻度 / 4–6 中度 / 7–10 重度 */
function nrsLabel(value: number): string {
  if (value === 0) return '0 无痛';
  if (value <= 3) return `${value} 轻度`;
  if (value <= 6) return `${value} 中度`;
  return `${value} 重度`;
}

interface FormValues {
  visitId: string;
  assessType: AssessType;
  location?: PainLocation;
  painNature?: string;
  triggerFactor?: string;
  reliefFactor?: string;
  score: number;
  assessedAt: Dayjs;
  signature: string;
  note?: string;
}

export default function PainAssessmentM521Page() {
  usePageTitle('疼痛 NRS 0–10 评估');
  const { hasPermission } = usePermission();
  const canAssess = hasPermission('pain:assess');
  const currentUser = useAuthStore((s) => s.user);

  const { records, loading, acting, error, demo, load, submit } = usePainAssessmentFormStore();
  const [form] = Form.useForm<FormValues>();
  const [visitOptions, setVisitOptions] = useState<VisitOption[]>([]);
  const [visitsLoading, setVisitsLoading] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<VisitOption | null>(null);
  const [analgesiaOpen, setAnalgesiaOpen] = useState(false);
  const [analgesiaRecord, setAnalgesiaRecord] = useState<PainAssessmentRecord | null>(null);
  const [detailRecord, setDetailRecord] = useState<PainAssessmentRecord | null>(null);

  useEffect(() => {
    void load();
    // 初始患者队列（空关键字）
    void loadVisits('');
  }, [load]);

  const loadVisits = async (keyword: string) => {
    setVisitsLoading(true);
    const res = await searchVisits(keyword);
    setVisitOptions(res.data);
    setVisitsLoading(false);
  };

  const selectedScore = Form.useWatch('score', form);
  const selectedType = Form.useWatch('assessType', form);

  const previewLevel: PainLevel | null =
    selectedScore != null && selectedType ? classifyPainLevel(selectedScore) : null;
  const previewAdvice: string | null =
    selectedScore != null && selectedType ? resolveAdvice(selectedScore, selectedType) : null;
  const previewReassess: number | null =
    selectedScore != null && selectedType ? resolveReassessHours(selectedScore, selectedType) : null;
  const previewNeed = selectedScore != null && isNeedAnalgesia(selectedScore);

  const onVisitChange = (visitId: string) => {
    const opt = visitOptions.find((v) => v.visitId === visitId) ?? null;
    setSelectedVisit(opt);
    // 上级变更清空失效下级
    form.setFieldsValue({
      assessType: undefined,
      location: undefined,
      painNature: undefined,
      triggerFactor: undefined,
      reliefFactor: undefined,
      score: undefined,
      note: undefined,
      signature: currentUser?.realName ?? '',
    });
  };

  const buildSubmitInput = (values: FormValues): PainAssessmentSubmitInput => ({
    visitId: values.visitId,
    patientId: selectedVisit?.patientId,
    patientName: selectedVisit?.name,
    score: values.score,
    assessType: values.assessType,
    location: values.location,
    painNature: values.painNature,
    triggerFactor: values.triggerFactor,
    reliefFactor: values.reliefFactor,
    note: values.note,
    signature: values.signature.trim(),
    assessorName: currentUser?.realName ?? '当前用户',
  });

  const doSubmit = async (values: FormValues) => {
    try {
      const result = await submit(buildSubmitInput(values));
      if (result.demo) {
        message.warning('BFF 不可用，已按本地演示记录留存，未写入业务库');
      } else {
        message.success('疼痛评估完成');
      }
      if (result.record.needAnalgesia) {
        setAnalgesiaRecord(result.record);
        setAnalgesiaOpen(true);
      }
      form.resetFields();
      setSelectedVisit(null);
      await load();
    } catch {
      // error 已写入 store，由 Alert 统一展示
    }
  };

  const historyColumns = useMemo(
    () => [
      {
        title: '评估时间',
        dataIndex: 'createdAt',
        ellipsis: true,
        render: (v: string) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '—'),
      },
      { title: '患者', dataIndex: 'patientName', render: (v: string, r: PainAssessmentRecord) => v ?? r.visitId.slice(-6) },
      {
        title: '部位',
        dataIndex: 'location',
        render: (v: string | null) => (v ? LOCATION_LABEL[v as PainLocation] ?? v : '—'),
      },
      {
        title: '评分',
        dataIndex: 'score',
        render: (v: number, r: PainAssessmentRecord) => <Tag color={LEVEL_COLOR[r.level]}>{v} 分</Tag>,
      },
      { title: '类型', dataIndex: 'assessType', render: (t: AssessType) => ASSESS_TYPE_LABEL[t] ?? t },
      {
        title: '分级',
        dataIndex: 'level',
        render: (l: PainLevel) => <Tag color={LEVEL_COLOR[l]}>{LEVEL_LABEL[l]}</Tag>,
      },
      {
        title: '需镇痛',
        dataIndex: 'needAnalgesia',
        render: (v: boolean) => <Tag color={v ? 'red' : 'green'}>{v ? '是' : '否'}</Tag>,
      },
      {
        title: '复评间隔',
        dataIndex: 'reassessHours',
        render: (v: number) => <Tag color="default">{v} 小时</Tag>,
      },
      { title: '建议', dataIndex: 'advice', ellipsis: true, render: (v: string) => v ?? '—' },
      { title: '签名', dataIndex: 'signature', render: (v?: string) => v ?? '—' },
      {
        title: '操作',
        render: (_: unknown, r: PainAssessmentRecord) => (
          <Button size="small" type="link" onClick={() => setDetailRecord(r)}>查看</Button>
        ),
      },
    ],
    [],
  );

  return (
    <PageContainer
      title="疼痛 NRS 0–10 评估"
      description="入院 / 术后 / 癌性 / 随访疼痛结构化评估 · 分级阈值与后端纯函数一致 · 中度以上自动通知医师闭环"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title="新建疼痛评估" style={{ marginBottom: 16 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={doSubmit}
          requiredMark="optional"
          initialValues={{ signature: currentUser?.realName ?? '', assessedAt: dayjs() }}
        >
          <Row gutter={16}>
            <Col span={10}>
              <Form.Item
                name="visitId"
                label="患者 / 就诊（远程搜索）"
                rules={[{ required: true, message: '请选择患者/就诊' }]}
              >
                <Select
                  showSearch
                  placeholder="输入姓名 / 科室 / 诊断搜索"
                  loading={visitsLoading}
                  options={visitOptions.map((v) => ({
                    value: v.visitId,
                    label: `${v.name} · ${v.dept} · ${v.diagnosis}`,
                  }))}
                  onSearch={loadVisits}
                  onFocus={() => loadVisits('')}
                  onChange={onVisitChange}
                  filterOption={false}
                />
              </Form.Item>
            </Col>
            {selectedVisit && (
              <Col span={14}>
                <Alert
                  type="info"
                  showIcon
                  style={{ marginTop: 30 }}
                  message={`${selectedVisit.name}（${selectedVisit.gender === 'male' ? '男' : '女'} · ${selectedVisit.age} 岁 · ${selectedVisit.bedNo}）`}
                  description={`诊断：${selectedVisit.diagnosis}${selectedVisit.diagnosisIcd10 ? `（ICD-10 ${selectedVisit.diagnosisIcd10}）` : ''}`}
                />
              </Col>
            )}
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="assessType"
                label="评估类型"
                rules={[{ required: true, message: '请选择评估类型' }]}
              >
                <Select
                  placeholder="选择评估类型"
                  options={(Object.keys(ASSESS_TYPE_LABEL) as AssessType[]).map((t) => ({
                    value: t,
                    label: ASSESS_TYPE_LABEL[t],
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="location"
                label="疼痛部位"
                rules={[{ required: true, message: '请选择疼痛部位' }]}
              >
                <Select
                  showSearch
                  placeholder="选择疼痛部位"
                  options={(Object.keys(LOCATION_LABEL) as PainLocation[]).map((l) => ({
                    value: l,
                    label: LOCATION_LABEL[l],
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="painNature" label="疼痛性质">
                <Select
                  placeholder="选择疼痛性质"
                  allowClear
                  options={PAIN_NATURE_OPTIONS.map((n) => ({ value: n, label: n }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <div
            style={{
              marginBottom: 12,
              padding: '12px 16px',
              borderRadius: 8,
              background: previewLevel ? LEVEL_BAR_COLOR[previewLevel] : '#F0F2F5',
            }}
          >
            <Space size={12} style={{ width: '100%', justifyContent: 'space-between' }}>
              <Space>
                <HeartFilled style={{ color: previewLevel ? '#fff' : 'rgba(0,0,0,0.45)' }} />
                <Typography.Text strong style={{ color: previewLevel ? '#fff' : 'rgba(0,0,0,0.65)' }}>
                  {selectedScore == null
                    ? '请选择 NRS 评分'
                    : `当前评分 ${selectedScore} 分${previewLevel ? ` · ${LEVEL_LABEL[previewLevel]}` : ''}`}
                </Typography.Text>
                {previewLevel && <Tag color={LEVEL_COLOR[previewLevel]}>{LEVEL_LABEL[previewLevel]}</Tag>}
                {previewNeed && <Tag color="red">需镇痛</Tag>}
              </Space>
              <Space>
                {previewAdvice && (
                  <Typography.Text style={{ color: previewLevel ? '#fff' : 'rgba(0,0,0,0.65)' }}>
                    {previewAdvice}
                  </Typography.Text>
                )}
                {previewReassess != null && (
                  <Typography.Text style={{ color: previewLevel ? '#fff' : 'rgba(0,0,0,0.45)' }}>
                    复评间隔 {previewReassess} 小时
                  </Typography.Text>
                )}
              </Space>
            </Space>
          </div>

          <Form.Item
            name="score"
            label="NRS 疼痛评分（0 无痛 – 10 剧痛）"
            rules={[
              { required: true, message: '请选择 NRS 疼痛评分' },
              { type: 'number', min: 0, max: 10, message: '评分须在 0–10 之间' },
              {
                validator: (_, v: number | undefined) =>
                  v == null || Number.isInteger(v)
                    ? Promise.resolve()
                    : Promise.reject(new Error('评分须为 0–10 整数')),
              },
            ]}
          >
            <Radio.Group>
              <Row gutter={[12, 8]}>
                {Array.from({ length: 11 }, (_, n) => (
                  <Col span={4} key={n}>
                    <Radio value={n}>{nrsLabel(n)}</Radio>
                  </Col>
                ))}
              </Row>
            </Radio.Group>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="triggerFactor" label="触发因素">
                <TextArea rows={2} placeholder="如翻身活动、咳嗽、进食等诱发加重因素" maxLength={200} showCount />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="reliefFactor" label="缓解因素">
                <TextArea rows={2} placeholder="如休息、体位改变、镇痛药物后缓解情况" maxLength={200} showCount />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="note" label="补充备注">
            <TextArea rows={3} placeholder="既往镇痛史、疼痛发作规律、特殊查体等补充说明" maxLength={500} showCount />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="assessedAt" label="评估时间" rules={[{ required: true, message: '请选择评估时间' }]}>
                <DatePicker showTime format="YYYY-MM-DD HH:mm" className="w-full" placeholder="选择日期时间" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="signature"
                label="评估护士 / 医师电子签名"
                rules={[
                  { required: true, message: '请签署评估人员姓名' },
                  { whitespace: true, message: '签名不能为空' },
                ]}
              >
                <Input placeholder="评估人员本人签名" maxLength={20} />
              </Form.Item>
            </Col>
          </Row>

          <Space>
            <Button type="primary" htmlType="submit" loading={acting} disabled={!canAssess}>
              提交疼痛评估
            </Button>
            {!canAssess && <Typography.Text type="secondary">当前账号缺少 pain:assess 权限，无法登记</Typography.Text>}
          </Space>
        </Form>
      </Card>

      <Card size="small" title={`疼痛评估记录${demo ? '（演示数据）' : ''}`}>
        <Spin spinning={loading}>
          <Table
            rowKey={(r) => r.id}
            dataSource={records}
            columns={historyColumns}
            size="small"
            pagination={{ pageSize: 8, showSizeChanger: false }}
            scroll={{ x: 1100 }}
          />
        </Spin>
      </Card>

      <Modal
        open={analgesiaOpen}
        title={<Space><HeartFilled /> 已通知医师评估镇痛方案</Space>}
        onCancel={() => setAnalgesiaOpen(false)}
        footer={<Button onClick={() => setAnalgesiaOpen(false)}>关闭</Button>}
      >
        {analgesiaRecord && (
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <Alert type="warning" showIcon message={analgesiaRecord.advice} />
            <div>
              当前评分：
              <Tag color={LEVEL_COLOR[analgesiaRecord.level]}>
                {analgesiaRecord.score} 分 · {LEVEL_LABEL[analgesiaRecord.level]}
              </Tag>
            </div>
            <div>复评间隔：{analgesiaRecord.reassessHours} 小时</div>
            {analgesiaRecord.interventionTaskId ? (
              <div>医师闭环待办：<Tag color="blue">{analgesiaRecord.interventionTaskId}</Tag></div>
            ) : (
              <Alert type="info" showIcon message="本地演示，待办未生成" />
            )}
          </Space>
        )}
      </Modal>

      <Modal
        open={detailRecord != null}
        title="疼痛评估详情"
        onCancel={() => setDetailRecord(null)}
        footer={<Button onClick={() => setDetailRecord(null)}>关闭</Button>}
      >
        {detailRecord && (
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <div>
              患者：{detailRecord.patientName ?? detailRecord.patientId ?? detailRecord.visitId.slice(-6)}
              {' · '}就诊：{detailRecord.visitId}
            </div>
            <div>
              评分：<Tag color={LEVEL_COLOR[detailRecord.level]}>{detailRecord.score} 分</Tag>
              <Tag color={LEVEL_COLOR[detailRecord.level]}>{LEVEL_LABEL[detailRecord.level]}</Tag>
            </div>
            <div>
              类型：{ASSESS_TYPE_LABEL[detailRecord.assessType] ?? detailRecord.assessType}
              {' · '}部位：
              {detailRecord.location ? LOCATION_LABEL[detailRecord.location as PainLocation] ?? detailRecord.location : '—'}
            </div>
            {detailRecord.painNature && <div>疼痛性质：{detailRecord.painNature}</div>}
            {detailRecord.triggerFactor && <div>触发因素：{detailRecord.triggerFactor}</div>}
            {detailRecord.reliefFactor && <div>缓解因素：{detailRecord.reliefFactor}</div>}
            {detailRecord.note && <div>备注：{detailRecord.note}</div>}
            <div>
              需镇痛：
              <Tag color={detailRecord.needAnalgesia ? 'red' : 'green'}>
                {detailRecord.needAnalgesia ? '是' : '否'}
              </Tag>
              {' · '}复评间隔：{detailRecord.reassessHours} 小时
            </div>
            <div>建议：{detailRecord.advice}</div>
            {detailRecord.interventionTaskId && (
              <div>医师闭环待办：<Tag color="blue">{detailRecord.interventionTaskId}</Tag></div>
            )}
            <div>
              评估人员：{detailRecord.assessorName ?? detailRecord.signature} · 时间：
              {dayjs(detailRecord.createdAt).format('YYYY-MM-DD HH:mm')}
            </div>
          </Space>
        )}
      </Modal>
    </PageContainer>
  );
}
