/**
 * 健澜科技 jlmedaios - 肿瘤随访（M537 修正契约，P0）
 *
 * 三甲流程：患者/就诊 Select 远程搜索带出信息 → 癌种 Select → TNM Ⅰ–Ⅳ Radio
 * → 治疗阶段 Radio 6 种 → 上次/下次治疗 DatePicker → CEA / CT 评分（可空）→ 备注
 * → 实时预览：Ⅳ 期距下次治疗超 30 天红色 Alert「晚期患者距下次治疗超 30 天，需紧急复核」。
 * 签名留痕，后端二次计算 needsUrgentReview。
 * 历史 antd Table（needsUrgentReview 红 Tag）+ 详情 Modal；BFF 不可用由 store/service 降级确定性 DEMO 并打标。
 *
 * 权限码：oncology:followup（登记）/ oncology:view（查看历史）。
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
  InputNumber,
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
import dayjs, { type Dayjs } from 'dayjs';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { usePermission } from '@/router/guards';
import { useAuthStore } from '@/store/authStore';
import { useOncologyFollowupFormStore } from '@/store/oncologyFollowupFormStore';
import {
  searchVisits,
  type VisitOption,
} from '@/services/api/clinicalDict';
import {
  PHASE_LABEL,
  PHASES,
  STAGES,
  TNM_LABEL,
  TUMOR_LABEL,
  TUMORS,
  isUrgentReview,
  type OncologyFollowupRecord,
  type OncologyFollowupSubmitInput,
  type TreatmentPhase,
  type TnmStage,
  type TumorType,
} from '@/services/api/oncologyFollowupForm';

interface FormValues {
  visitId: string;
  tumorType: TumorType;
  tnmStage: TnmStage;
  treatmentPhase: TreatmentPhase;
  lastTreatmentAt: Dayjs;
  nextTreatmentAt: Dayjs;
  cea: number | null;
  ct_score: number | null;
  notes?: string;
  signature: string;
}

export default function OncologyFollowupM521Page() {
  usePageTitle('肿瘤随访');
  const { hasPermission } = usePermission();
  const canFollowup = hasPermission('oncology:followup');
  const currentUser = useAuthStore((s) => s.user);

  const { records, loading, acting, error, demo, load, submit } = useOncologyFollowupFormStore();
  const [form] = Form.useForm<FormValues>();
  const [visitOptions, setVisitOptions] = useState<VisitOption[]>([]);
  const [visitsLoading, setVisitsLoading] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<VisitOption | null>(null);
  const [detailRecord, setDetailRecord] = useState<OncologyFollowupRecord | null>(null);

  useEffect(() => {
    void load();
    void loadVisits('');
  }, [load]);

  const loadVisits = async (keyword: string) => {
    setVisitsLoading(true);
    const res = await searchVisits(keyword);
    setVisitOptions(res.data);
    setVisitsLoading(false);
  };

  const watched = Form.useWatch([], form) ?? {};
  const urgentPreview = useMemo(() => {
    if (!watched.tnmStage || !watched.nextTreatmentAt) return null;
    return isUrgentReview(watched.tnmStage as TnmStage, (watched.nextTreatmentAt as Dayjs).valueOf());
  }, [watched]);

  const onVisitChange = (visitId: string) => {
    const opt = visitOptions.find((v) => v.visitId === visitId) ?? null;
    setSelectedVisit(opt);
    form.setFieldsValue({ signature: currentUser?.realName ?? '' });
  };

  const doSubmit = async (values: FormValues) => {
    if (!selectedVisit) return;
    const input: OncologyFollowupSubmitInput = {
      patientId: selectedVisit.patientId,
      patientName: selectedVisit.name,
      tumorType: values.tumorType,
      tnmStage: values.tnmStage,
      treatmentPhase: values.treatmentPhase,
      lastTreatmentAt: values.lastTreatmentAt.toISOString(),
      nextTreatmentAt: values.nextTreatmentAt.toISOString(),
      cea: values.cea ?? null,
      ct_score: values.ct_score ?? null,
      notes: values.notes?.trim() || null,
      followedUpAt: new Date().toISOString(),
      signature: values.signature.trim(),
      assessorName: currentUser?.realName ?? '当前用户',
    };
    try {
      const result = await submit(input);
      if (result.demo) {
        message.warning('BFF 不可用，本次随访已按本地演示记录留存，未写入业务库');
      } else if (result.record.needsUrgentReview) {
        message.warning(`随访完成：Ⅳ 期患者距下次治疗已超 30 天，需紧急复核`);
      } else {
        message.success('肿瘤随访完成');
      }
      form.resetFields();
      setSelectedVisit(null);
      await load();
    } catch {
      // error 已写入 store
    }
  };

  const historyColumns = useMemo(
    () => [
      { title: '随访时间', dataIndex: 'followedUpAt', ellipsis: true, render: (v: string) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '—') },
      { title: '患者', dataIndex: 'patientName', render: (v: string, r: OncologyFollowupRecord) => v ?? r.patientId },
      { title: '癌种', dataIndex: 'tumorType', render: (v: TumorType) => TUMOR_LABEL[v] },
      { title: 'TNM', dataIndex: 'tnmStage', render: (v: TnmStage) => TNM_LABEL[v] },
      { title: '治疗阶段', dataIndex: 'treatmentPhase', render: (v: TreatmentPhase) => PHASE_LABEL[v] },
      { title: '下次治疗', dataIndex: 'nextTreatmentAt', render: (v: string) => (v ? dayjs(v).format('YYYY-MM-DD') : '—') },
      { title: '紧急复核', dataIndex: 'needsUrgentReview', render: (v: boolean) => (v ? <Tag color="red">超期需复核</Tag> : <Tag color="green">正常</Tag>) },
      {
        title: '操作',
        render: (_: unknown, r: OncologyFollowupRecord) => (
          <Button size="small" type="link" onClick={() => setDetailRecord(r)}>查看</Button>
        ),
      },
    ],
    [],
  );

  return (
    <PageContainer
      title="肿瘤随访"
      description="癌种/TNM 分期/治疗阶段 · Ⅳ 期距下次治疗超 30 天自动提示紧急复核"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title="新建肿瘤随访" style={{ marginBottom: 16 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={doSubmit}
          requiredMark="optional"
          initialValues={{
            tumorType: 'lung' as TumorType,
            tnmStage: 'II' as TnmStage,
            treatmentPhase: 'chemo' as TreatmentPhase,
            lastTreatmentAt: dayjs(),
            nextTreatmentAt: dayjs().add(21, 'day'),
            signature: currentUser?.realName ?? '',
          }}
        >
          <Row gutter={16}>
            <Col span={10}>
              <Form.Item name="visitId" label="患者 / 就诊（远程搜索）" rules={[{ required: true, message: '请选择患者/就诊' }]}>
                <Select
                  showSearch
                  placeholder="输入姓名 / 科室 / 诊断搜索"
                  loading={visitsLoading}
                  options={visitOptions.map((v) => ({ value: v.visitId, label: `${v.name} · ${v.dept} · ${v.diagnosis}` }))}
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
                  description={`诊断：${selectedVisit.diagnosis}`}
                />
              </Col>
            )}
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="tumorType" label="癌种" rules={[{ required: true, message: '请选择癌种' }]}>
                <Select options={TUMORS.map((v) => ({ value: v, label: TUMOR_LABEL[v] }))} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="tnmStage" label="TNM 分期" rules={[{ required: true, message: '请选择 TNM 分期' }]}>
                <Radio.Group>
                  <Space>
                    {STAGES.map((s) => <Radio.Button key={s} value={s}>{TNM_LABEL[s]}</Radio.Button>)}
                  </Space>
                </Radio.Group>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="treatmentPhase" label="治疗阶段" rules={[{ required: true, message: '请选择治疗阶段' }]}>
                <Select options={PHASES.map((v) => ({ value: v, label: PHASE_LABEL[v] }))} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="lastTreatmentAt" label="上次治疗时间" rules={[{ required: true, message: '请选择上次治疗时间' }]}>
                <DatePicker showTime format="YYYY-MM-DD HH:mm" className="w-full" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="nextTreatmentAt" label="下次治疗时间" rules={[{ required: true, message: '请选择下次治疗时间' }]}>
                <DatePicker showTime format="YYYY-MM-DD HH:mm" className="w-full" />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="cea" label="CEA（ng/mL，可空）"><InputNumber className="w-full" min={0} max={200} step={0.1} /></Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="ct_score" label="CT 评分（可空）"><InputNumber className="w-full" min={0} max={20} step={0.1} /></Form.Item>
            </Col>
          </Row>

          {urgentPreview && (
            <Alert type="error" showIcon style={{ marginBottom: 12 }} message="晚期患者距下次治疗超 30 天，需紧急复核" />
          )}

          <Row gutter={16}>
            <Col span={16}>
              <Form.Item name="notes" label="随访备注（可选）">
                <Input.TextArea rows={2} maxLength={200} showCount />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="signature"
                label="随访医师电子签名"
                rules={[{ required: true, message: '请签署随访医师姓名' }, { whitespace: true, message: '签名不能为空' }]}
              >
                <Input placeholder="随访医师本人签名" maxLength={20} />
              </Form.Item>
            </Col>
          </Row>

          <Space>
            <Button type="primary" htmlType="submit" loading={acting} disabled={!canFollowup}>提交随访</Button>
            {!canFollowup && <Typography.Text type="secondary">当前账号缺少 oncology:followup 权限，无法登记</Typography.Text>}
            {urgentPreview != null && <Tag color={urgentPreview ? 'red' : 'green'}>{urgentPreview ? '实时：超期需复核' : '实时：正常'}</Tag>}
          </Space>
        </Form>
      </Card>

      <Card size="small" title={`肿瘤随访记录${demo ? '（演示数据）' : ''}`}>
        <Spin spinning={loading}>
          <Table
            rowKey={(r) => r.id}
            dataSource={records}
            columns={historyColumns}
            size="small"
            pagination={{ pageSize: 8, showSizeChanger: false }}
            scroll={{ x: 1000 }}
          />
        </Spin>
      </Card>

      <Modal
        open={detailRecord != null}
        title="肿瘤随访详情"
        onCancel={() => setDetailRecord(null)}
        footer={<Button onClick={() => setDetailRecord(null)}>关闭</Button>}
      >
        {detailRecord && (
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <div>患者：{detailRecord.patientName ?? detailRecord.patientId} · {TUMOR_LABEL[detailRecord.tumorType]} · {TNM_LABEL[detailRecord.tnmStage]}</div>
            <div>治疗阶段：{PHASE_LABEL[detailRecord.treatmentPhase]}</div>
            <div>上次治疗：{dayjs(detailRecord.lastTreatmentAt).format('YYYY-MM-DD HH:mm')} · 下次治疗：{dayjs(detailRecord.nextTreatmentAt).format('YYYY-MM-DD HH:mm')}</div>
            <div>
              {detailRecord.cea != null && `CEA ${detailRecord.cea} ng/mL · `}
              {detailRecord.ct_score != null && `CT 评分 ${detailRecord.ct_score}`}
            </div>
            <div>
              状态：{detailRecord.needsUrgentReview ? <Tag color="red">Ⅳ 期超期，需紧急复核</Tag> : <Tag color="green">正常</Tag>}
            </div>
            {detailRecord.notes && <div>备注：{detailRecord.notes}</div>}
            <div>随访医师：{detailRecord.assessorName ?? detailRecord.signature} · 时间：{dayjs(detailRecord.followedUpAt).format('YYYY-MM-DD HH:mm')}</div>
          </Space>
        )}
      </Modal>
    </PageContainer>
  );
}
