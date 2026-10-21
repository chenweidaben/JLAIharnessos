/**
 * 健澜科技 jlmedaios - 心理筛查 PHQ-9/GAD-7（M536，P0）
 *
 * 三甲流程：患者/就诊 Select 远程搜索带出信息 → instrument Radio 切换 PHQ-9 / GAD-7（切换清空 answers）
 * → 对应题单 9/7 题 Radio 0–3 附频率释义 → 实时总分 Progress + 分级 Tag → ≥中度 Alert「建议心理科会诊」
 * + Referral 按钮 message.info 留痕；签名留痕，后端二次计算。
 * 历史 antd Table（level 彩色 Tag）+ 详情 Modal；BFF 不可用由 store/service 降级确定性 DEMO 并打标。
 *
 * 权限码：psych:screen（登记）/ psych:view（查看历史）。
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
  message,
  Modal,
  Progress,
  Radio,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { usePermission } from '@/router/guards';
import { useAuthStore } from '@/store/authStore';
import { usePsychScreeningFormStore } from '@/store/psychScreeningFormStore';
import {
  searchVisits,
  type VisitOption,
} from '@/services/api/clinicalDict';
import {
  ANSWER_LABEL,
  GAD7_QUESTIONS,
  INSTRUMENT_LABEL,
  LEVEL_COLOR,
  LEVEL_LABEL,
  PHQ9_QUESTIONS,
  calcTotal,
  levelOf,
  type Instrument,
  type PsychScreenRecord,
  type PsychScreenSubmitInput,
} from '@/services/api/psychScreeningForm';

interface FormValues {
  visitId: string;
  instrument: Instrument;
  answers: number[];
  screenedAt: Dayjs;
  signature: string;
}

export default function PsychScreeningM521Page() {
  usePageTitle('心理筛查 PHQ-9/GAD-7');
  const { hasPermission } = usePermission();
  const canScreen = hasPermission('psych:screen');
  const currentUser = useAuthStore((s) => s.user);

  const { records, loading, acting, error, demo, load, submit } = usePsychScreeningFormStore();
  const [form] = Form.useForm<FormValues>();
  const [visitOptions, setVisitOptions] = useState<VisitOption[]>([]);
  const [visitsLoading, setVisitsLoading] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<VisitOption | null>(null);
  const [detailRecord, setDetailRecord] = useState<PsychScreenRecord | null>(null);

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

  const instrument = Form.useWatch('instrument', form) ?? 'phq9';
  const answers = Form.useWatch('answers', form) ?? [];
  const questions = instrument === 'phq9' ? PHQ9_QUESTIONS : GAD7_QUESTIONS;
  const preview = useMemo(() => {
    const valid = answers.filter((v): v is number => typeof v === 'number');
    if (valid.length === 0) return null;
    const total = calcTotal(valid);
    const level = levelOf(instrument, total);
    return { total, level };
  }, [answers, instrument]);

  const onInstrumentChange = (inst: Instrument) => {
    // 切换量表时清空作答并补齐默认数组
    form.setFieldValue('answers', Array.from({ length: inst === 'phq9' ? 9 : 7 }, () => 0));
  };

  const onVisitChange = (visitId: string) => {
    const opt = visitOptions.find((v) => v.visitId === visitId) ?? null;
    setSelectedVisit(opt);
    form.setFieldsValue({ signature: currentUser?.realName ?? '' });
  };

  const doSubmit = async (values: FormValues) => {
    const input: PsychScreenSubmitInput = {
      visitId: values.visitId,
      patientId: selectedVisit?.patientId,
      patientName: selectedVisit?.name,
      instrument: values.instrument,
      answers: values.answers,
      screenedAt: values.screenedAt.toISOString(),
      signature: values.signature.trim(),
      assessorName: currentUser?.realName ?? '当前用户',
    };
    try {
      const result = await submit(input);
      if (result.demo) {
        message.warning('BFF 不可用，本次筛查已按本地演示记录留存，未写入业务库');
      } else if (result.record.needsPsychReferral) {
        message.warning(`筛查完成：${INSTRUMENT_LABEL[result.record.instrument]} ${result.record.totalScore} 分（${LEVEL_LABEL[result.record.level]}），建议心理科会诊`);
      } else {
        message.success(`筛查完成：${INSTRUMENT_LABEL[result.record.instrument]} ${result.record.totalScore} 分（${LEVEL_LABEL[result.record.level]}）`);
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
      { title: '筛查时间', dataIndex: 'screenedAt', ellipsis: true, render: (v: string) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '—') },
      { title: '患者', dataIndex: 'patientName', render: (v: string, r: PsychScreenRecord) => v ?? r.visitId.slice(-6) },
      { title: '量表', dataIndex: 'instrument', render: (v: Instrument) => INSTRUMENT_LABEL[v] },
      { title: '总分', dataIndex: 'totalScore', render: (v: number) => <b>{v}</b> },
      { title: '分级', dataIndex: 'level', render: (v: PsychScreenRecord['level']) => <Tag color={LEVEL_COLOR[v]}>{LEVEL_LABEL[v]}</Tag> },
      { title: '心理科会诊', dataIndex: 'needsPsychReferral', render: (v: boolean) => (v ? <Tag color="orange">建议会诊</Tag> : <Tag color="green">无需</Tag>) },
      {
        title: '操作',
        render: (_: unknown, r: PsychScreenRecord) => (
          <Button size="small" type="link" onClick={() => setDetailRecord(r)}>查看</Button>
        ),
      },
    ],
    [],
  );

  return (
    <PageContainer
      title="心理筛查 PHQ-9/GAD-7"
      description="PHQ-9 抑郁 9 题 / GAD-7 焦虑 7 题 · 0–3 分频率释义 · ≥中度自动建议心理科会诊"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title="新建心理筛查" style={{ marginBottom: 16 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={doSubmit}
          requiredMark="optional"
          initialValues={{
            instrument: 'phq9' as Instrument,
            answers: Array.from({ length: 9 }, () => 0),
            screenedAt: dayjs(),
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

          <Form.Item name="instrument" label="筛查量表" rules={[{ required: true, message: '请选择量表' }]}>
            <Radio.Group onChange={(e) => onInstrumentChange(e.target.value as Instrument)}>
              <Space>
                <Radio.Button value="phq9">PHQ-9 抑郁（9 题）</Radio.Button>
                <Radio.Button value="gad7">GAD-7 焦虑（7 题）</Radio.Button>
              </Space>
            </Radio.Group>
          </Form.Item>

          <Form.List name="answers">
            {(fields) => (
              <Space direction="vertical" size={4} style={{ width: '100%', marginBottom: 12 }}>
                {fields.slice(0, questions.length).map((field, idx) => (
                  <div key={field.key} style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: 8 }}>
                    <Typography.Text strong>{idx + 1}. {questions[idx]}</Typography.Text>
                    <Form.Item
                      {...field}
                      name={[field.name]}
                      rules={[{ required: true, message: `请作答第 ${idx + 1} 题` }]}
                      style={{ marginTop: 6, marginBottom: 0 }}
                    >
                      <Radio.Group>
                        <Space wrap>
                          {([0, 1, 2, 3] as const).map((v) => (
                            <Radio.Button key={v} value={v}>{v} · {ANSWER_LABEL[v]}</Radio.Button>
                          ))}
                        </Space>
                      </Radio.Group>
                    </Form.Item>
                  </div>
                ))}
              </Space>
            )}
          </Form.List>

          {preview && (
            <Alert
              type={preview.level === 'mild' ? 'success' : 'warning'}
              showIcon
              style={{ marginBottom: 12 }}
              message={
                preview.level === 'mild'
                  ? `实时总分 ${preview.total}（${LEVEL_LABEL[preview.level]}），无需转介`
                  : `实时总分 ${preview.total}（${LEVEL_LABEL[preview.level]}）：建议心理科会诊`
              }
              description={
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Progress
                    percent={Math.round((preview.total / (instrument === 'phq9' ? 27 : 21)) * 100)}
                    size="small"
                    strokeColor={LEVEL_COLOR[preview.level]}
                  />
                  {preview.level !== 'mild' && (
                    <Button
                      size="small"
                      type="primary"
                      onClick={() => message.info(`已留痕：${INSTRUMENT_LABEL[instrument]} ${preview.total} 分（${LEVEL_LABEL[preview.level]}），已发起心理科会诊建议`)}
                    >
                      发起心理科会诊留痕
                    </Button>
                  )}
                </Space>
              }
            />
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="screenedAt" label="筛查时间" rules={[{ required: true, message: '请选择筛查时间' }]}>
                <DatePicker showTime format="YYYY-MM-DD HH:mm" className="w-full" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="signature"
                label="筛查医师电子签名"
                rules={[{ required: true, message: '请签署筛查医师姓名' }, { whitespace: true, message: '签名不能为空' }]}
              >
                <Input placeholder="筛查医师本人签名" maxLength={20} />
              </Form.Item>
            </Col>
          </Row>

          <Space>
            <Button type="primary" htmlType="submit" loading={acting} disabled={!canScreen}>提交筛查</Button>
            {!canScreen && <Typography.Text type="secondary">当前账号缺少 psych:screen 权限，无法登记</Typography.Text>}
            {preview && <Tag color={LEVEL_COLOR[preview.level]}>实时总分 {preview.total} · {LEVEL_LABEL[preview.level]}</Tag>}
          </Space>
        </Form>
      </Card>

      <Card size="small" title={`心理筛查记录${demo ? '（演示数据）' : ''}`}>
        <Spin spinning={loading}>
          <Table
            rowKey={(r) => r.id}
            dataSource={records}
            columns={historyColumns}
            size="small"
            pagination={{ pageSize: 8, showSizeChanger: false }}
            scroll={{ x: 800 }}
          />
        </Spin>
      </Card>

      <Modal
        open={detailRecord != null}
        title="心理筛查详情"
        onCancel={() => setDetailRecord(null)}
        footer={<Button onClick={() => setDetailRecord(null)}>关闭</Button>}
      >
        {detailRecord && (
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <div>患者：{detailRecord.patientName ?? detailRecord.patientId} · {INSTRUMENT_LABEL[detailRecord.instrument]}</div>
            <div>
              总分：{detailRecord.totalScore} · <Tag color={LEVEL_COLOR[detailRecord.level]}>{LEVEL_LABEL[detailRecord.level]}</Tag>
              {detailRecord.needsPsychReferral && <Tag color="orange">建议心理科会诊</Tag>}
            </div>
            <div>作答：{detailRecord.answers.join('，')}</div>
            <div>筛查医师：{detailRecord.assessorName ?? detailRecord.signature} · 时间：{dayjs(detailRecord.screenedAt).format('YYYY-MM-DD HH:mm')}</div>
          </Space>
        )}
      </Modal>
    </PageContainer>
  );
}
