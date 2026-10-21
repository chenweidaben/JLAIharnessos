/**
 * 健澜科技 jlmedaios - 产后访视（M538，P0）
 *
 * 三甲流程：患者/就诊 Select 远程搜索带出信息 → visitType 4 档 Radio
 * → 体温 InputNumber → 宫底/恶露/乳房/伤口 四组 Select → Edinburgh 0-10 量表 InputNumber
 * → 实时预览：任一异常命中红色 Alert「需医师复核」并列出 riskTags 中文短语。
 * 签名留痕，后端二次计算 needsPhysicianReview + riskTags。
 * 历史 antd Table（riskTags 彩色 Tag）+ 详情 Modal；BFF 不可用由 store/service 降级确定性 DEMO 并打标。
 *
 * 权限码：postpartum:visit（登记）/ postpartum:view（查看历史）。
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
import { usePostpartumVisitFormStore } from '@/store/postpartumVisitFormStore';
import {
  searchVisits,
  type VisitOption,
} from '@/services/api/clinicalDict';
import {
  BREAST_LABEL,
  FUNDUS_LABEL,
  LOCHIA_LABEL,
  RISK_TAG_LABEL,
  VISIT_TYPE_LABEL,
  VISIT_TYPES,
  WOUND_LABEL,
  computeRiskTags,
  type Breast,
  type Fundus,
  type Lochia,
  type PostpartumVisitRecord,
  type PostpartumVisitSubmitInput,
  type VisitType,
  type Wound,
} from '@/services/api/postpartumVisitForm';

interface FormValues {
  visitId: string;
  visitType: VisitType;
  temperature: number;
  fundusInvolution: Fundus;
  lochia: Lochia;
  breastCondition: Breast;
  woundHealing: Wound;
  mentalScale: number;
  babyRef?: string;
  notes?: string;
  visitedAt: Dayjs;
  signature: string;
}

export default function PostpartumVisitM521Page() {
  usePageTitle('产后访视');
  const { hasPermission } = usePermission();
  const canVisit = hasPermission('postpartum:visit');
  const currentUser = useAuthStore((s) => s.user);

  const { records, loading, acting, error, demo, load, submit } = usePostpartumVisitFormStore();
  const [form] = Form.useForm<FormValues>();
  const [visitOptions, setVisitOptions] = useState<VisitOption[]>([]);
  const [visitsLoading, setVisitsLoading] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<VisitOption | null>(null);
  const [detailRecord, setDetailRecord] = useState<PostpartumVisitRecord | null>(null);

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
  const previewTags = useMemo(() => {
    if (
      typeof watched.temperature !== 'number' ||
      !watched.lochia || !watched.woundHealing ||
      typeof watched.mentalScale !== 'number'
    ) {
      return null;
    }
    return computeRiskTags(
      watched.temperature as number,
      watched.lochia as Lochia,
      watched.woundHealing as Wound,
      watched.mentalScale as number,
    );
  }, [watched]);

  const onVisitChange = (visitId: string) => {
    const opt = visitOptions.find((v) => v.visitId === visitId) ?? null;
    setSelectedVisit(opt);
    form.setFieldsValue({ signature: currentUser?.realName ?? '' });
  };

  const doSubmit = async (values: FormValues) => {
    const input: PostpartumVisitSubmitInput = {
      visitId: values.visitId,
      patientId: selectedVisit?.patientId,
      patientName: selectedVisit?.name,
      visitType: values.visitType,
      temperature: values.temperature,
      fundusInvolution: values.fundusInvolution,
      lochia: values.lochia,
      breastCondition: values.breastCondition,
      woundHealing: values.woundHealing,
      mentalScale: values.mentalScale,
      babyRef: values.babyRef?.trim() || null,
      notes: values.notes?.trim() || null,
      visitedAt: values.visitedAt.toISOString(),
      signature: values.signature.trim(),
      assessorName: currentUser?.realName ?? '当前用户',
    };
    try {
      const result = await submit(input);
      if (result.demo) {
        message.warning('BFF 不可用，本次访视已按本地演示记录留存，未写入业务库');
      } else if (result.record.needsPhysicianReview) {
        message.warning(`访视完成：命中 ${result.record.riskTags.length} 项异常，需医师复核`);
      } else {
        message.success('访视完成：各项正常，无需医师复核');
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
      { title: '访视时间', dataIndex: 'visitedAt', ellipsis: true, render: (v: string) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '—') },
      { title: '产妇', dataIndex: 'patientName', render: (v: string, r: PostpartumVisitRecord) => v ?? r.visitId.slice(-6) },
      { title: '访视类型', dataIndex: 'visitType', render: (v: VisitType) => VISIT_TYPE_LABEL[v] },
      { title: '体温', dataIndex: 'temperature', render: (v: number) => `${v}℃` },
      { title: 'Edinburgh', dataIndex: 'mentalScale', render: (v: number) => v },
      {
        title: '风险标记',
        dataIndex: 'riskTags',
        render: (tags: string[]) =>
          tags.length === 0
            ? <Tag color="green">正常</Tag>
            : tags.map((t) => <Tag key={t} color="red">{RISK_TAG_LABEL[t] ?? t}</Tag>),
      },
      {
        title: '操作',
        render: (_: unknown, r: PostpartumVisitRecord) => (
          <Button size="small" type="link" onClick={() => setDetailRecord(r)}>查看</Button>
        ),
      },
    ],
    [],
  );

  return (
    <PageContainer
      title="产后访视"
      description="体温/恶露/伤口/乳房/宫底/Edinburgh 多条件组合评估 · 任一异常自动提示医师复核"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title="新建产后访视" style={{ marginBottom: 16 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={doSubmit}
          requiredMark="optional"
          initialValues={{
            visitType: 'day7' as VisitType,
            temperature: 36.5,
            fundusInvolution: 'normal' as Fundus,
            lochia: 'normal' as Lochia,
            breastCondition: 'normal' as Breast,
            woundHealing: 'healing' as Wound,
            mentalScale: 0,
            visitedAt: dayjs(),
            signature: currentUser?.realName ?? '',
          }}
        >
          <Row gutter={16}>
            <Col span={10}>
              <Form.Item name="visitId" label="产妇 / 就诊（远程搜索）" rules={[{ required: true, message: '请选择产妇/就诊' }]}>
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
              <Form.Item name="visitType" label="访视类型" rules={[{ required: true, message: '请选择访视类型' }]}>
                <Radio.Group>
                  <Space wrap>
                    {VISIT_TYPES.map((t) => <Radio.Button key={t} value={t}>{VISIT_TYPE_LABEL[t]}</Radio.Button>)}
                  </Space>
                </Radio.Group>
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="temperature" label="体温（℃）" rules={[{ required: true, message: '请输入体温' }]}>
                <InputNumber className="w-full" min={35} max={42} step={0.1} />
              </Form.Item>
            </Col>
            <Col span={5}>
              <Form.Item name="mentalScale" label="Edinburgh 量表（0-10 粗分）" rules={[{ required: true, message: '请输入量表分' }]}>
                <InputNumber className="w-full" min={0} max={10} step={1} />
              </Form.Item>
            </Col>
            <Col span={7}>
              <Form.Item name="babyRef" label="关联新生儿（可选）">
                <Input placeholder="如 B-2026-001" maxLength={40} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="fundusInvolution" label="宫底复旧" rules={[{ required: true, message: '请选择宫底情况' }]}>
                <Select options={Object.entries(FUNDUS_LABEL).map(([v, label]) => ({ value: v, label }))} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="lochia" label="恶露" rules={[{ required: true, message: '请选择恶露情况' }]}>
                <Select options={Object.entries(LOCHIA_LABEL).map(([v, label]) => ({ value: v, label }))} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="breastCondition" label="乳房" rules={[{ required: true, message: '请选择乳房情况' }]}>
                <Select options={Object.entries(BREAST_LABEL).map(([v, label]) => ({ value: v, label }))} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="woundHealing" label="伤口愈合" rules={[{ required: true, message: '请选择伤口情况' }]}>
                <Select options={Object.entries(WOUND_LABEL).map(([v, label]) => ({ value: v, label }))} />
              </Form.Item>
            </Col>
          </Row>

          {previewTags && previewTags.length > 0 && (
            <Alert
              type="error"
              showIcon
              style={{ marginBottom: 12 }}
              message="本次访视命中以下异常，需医师复核"
              description={
                <Space wrap>
                  {previewTags.map((t) => <Tag key={t} color="red">{RISK_TAG_LABEL[t] ?? t}</Tag>)}
                </Space>
              }
            />
          )}

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="notes" label="访视备注（可选）">
                <Input.TextArea rows={2} maxLength={200} showCount />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="visitedAt" label="访视时间" rules={[{ required: true, message: '请选择访视时间' }]}>
                <DatePicker showTime format="YYYY-MM-DD HH:mm" className="w-full" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="signature"
                label="访视医师电子签名"
                rules={[{ required: true, message: '请签署访视医师姓名' }, { whitespace: true, message: '签名不能为空' }]}
              >
                <Input placeholder="访视医师本人签名" maxLength={20} />
              </Form.Item>
            </Col>
          </Row>

          <Space>
            <Button type="primary" htmlType="submit" loading={acting} disabled={!canVisit}>提交访视</Button>
            {!canVisit && <Typography.Text type="secondary">当前账号缺少 postpartum:visit 权限，无法登记</Typography.Text>}
            {previewTags && (
              <Tag color={previewTags.length > 0 ? 'red' : 'green'}>
                实时：{previewTags.length > 0 ? `命中 ${previewTags.length} 项异常` : '各项正常'}
              </Tag>
            )}
          </Space>
        </Form>
      </Card>

      <Card size="small" title={`产后访视记录${demo ? '（演示数据）' : ''}`}>
        <Spin spinning={loading}>
          <Table
            rowKey={(r) => r.id}
            dataSource={records}
            columns={historyColumns}
            size="small"
            pagination={{ pageSize: 8, showSizeChanger: false }}
            scroll={{ x: 900 }}
          />
        </Spin>
      </Card>

      <Modal
        open={detailRecord != null}
        title="产后访视详情"
        onCancel={() => setDetailRecord(null)}
        footer={<Button onClick={() => setDetailRecord(null)}>关闭</Button>}
      >
        {detailRecord && (
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <div>产妇：{detailRecord.patientName ?? detailRecord.patientId} · {VISIT_TYPE_LABEL[detailRecord.visitType]}</div>
            <div>
              体温 {detailRecord.temperature}℃ · Edinburgh {detailRecord.mentalScale} · {FUNDUS_LABEL[detailRecord.fundusInvolution]} · {LOCHIA_LABEL[detailRecord.lochia]} · {BREAST_LABEL[detailRecord.breastCondition]} · {WOUND_LABEL[detailRecord.woundHealing]}
            </div>
            <div>
              风险：{detailRecord.needsPhysicianReview
                ? detailRecord.riskTags.map((t) => <Tag key={t} color="red">{RISK_TAG_LABEL[t] ?? t}</Tag>)
                : <Tag color="green">正常</Tag>}
            </div>
            {detailRecord.babyRef && <div>关联新生儿：{detailRecord.babyRef}</div>}
            {detailRecord.notes && <div>备注：{detailRecord.notes}</div>}
            <div>访视医师：{detailRecord.assessorName ?? detailRecord.signature} · 时间：{dayjs(detailRecord.visitedAt).format('YYYY-MM-DD HH:mm')}</div>
          </Space>
        )}
      </Modal>
    </PageContainer>
  );
}
