/**
 * 健澜科技 jlmedaios - VTE 抗凝疗程管理（M521-C，P0 首批）
 *
 * 三甲流程：患者/就诊 Select 远程搜索带出姓名/性别/年龄/床号/诊断 → 抗凝药品
 * 联动展示规格/单位/途径/常用剂量/禁忌 Tag → 启动日期 + 计划天数（1–90）→ Caprini/
 * Padua 本地只读风险联动 → 启动医师签名留痕。历史 Table 展示疗程进度、出血评分
 * 分级与状态机；行内出血评分 Modal（≥40 医师复核签名必填）、停用 Modal、详情查看。
 * BFF 不可用由 store/service 降级确定性 DEMO 并打标。
 *
 * 权限码：vte:anticoagulate（启动/出血评分/停用）/ vte:view（查看历史）。
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
import { useVteAnticoagFormStore } from '@/store/vteAnticoagFormStore';
import {
  searchVisits,
  ROUTE_LABEL,
  type VisitOption,
} from '@/services/api/clinicalDict';
import {
  VTE_DRUGS,
  VTE_DRUG_LABEL,
  vteDrugRouteLabel,
  VTE_STATUS_LABEL,
  VTE_STATUS_COLOR,
  BLEEDING_LABEL,
  BLEEDING_COLOR,
  courseProgress,
  deriveStatus,
  bleedingLevelOf,
  isHighBleedingRisk,
  type VteDrug,
  type VteAnticoagRecord,
  type VteAnticoagSubmitInput,
} from '@/services/api/vteAnticoagForm';
import {
  capriniLevel,
  paduaLevel,
  VTE_LEVEL_LABEL,
  VTE_LEVEL_COLOR,
} from '@/utils/vteRisk';

const { TextArea } = Input;

interface FormValues {
  visitId: string;
  drug: VteDrug;
  startDate: Dayjs;
  plannedDays: number;
  signature: string;
  note?: string;
}

interface BleedingFormValues {
  score: number;
  reviewSignature?: string;
}

interface StopFormValues {
  endDate: Dayjs;
}

export default function VteAnticoagM521Page() {
  usePageTitle('VTE 抗凝疗程管理');
  const { hasPermission } = usePermission();
  const canView = hasPermission('vte:view');
  const canAct = hasPermission('vte:anticoagulate');
  const currentUser = useAuthStore((s) => s.user);

  const { records, loading, acting, error, demo, load, submit, recordBleeding, stop } =
    useVteAnticoagFormStore();

  const [form] = Form.useForm<FormValues>();
  const [bleedingForm] = Form.useForm<BleedingFormValues>();
  const [stopForm] = Form.useForm<StopFormValues>();

  const [visitOptions, setVisitOptions] = useState<VisitOption[]>([]);
  const [visitsLoading, setVisitsLoading] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<VisitOption | null>(null);

  const [bleedingRecord, setBleedingRecord] = useState<VteAnticoagRecord | null>(null);
  const [stopRecord, setStopRecord] = useState<VteAnticoagRecord | null>(null);
  const [detailRecord, setDetailRecord] = useState<VteAnticoagRecord | null>(null);

  // 本地只读风险评分（演示口径，随记录聚合进 note，不另发后端 key）
  const [capriniScore, setCapriniScore] = useState<number>(6);
  const [paduaScore, setPaduaScore] = useState<number>(4);

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

  const selectedDrug = Form.useWatch('drug', form);
  const drugMeta = selectedDrug ? VTE_DRUGS[selectedDrug] : null;

  const onVisitChange = (visitId: string) => {
    const opt = visitOptions.find((v) => v.visitId === visitId) ?? null;
    setSelectedVisit(opt);
    // 上级变更清空失效下级
    form.setFieldsValue({
      drug: undefined,
      startDate: dayjs(),
      plannedDays: undefined,
      signature: currentUser?.realName ?? '',
      note: undefined,
    });
    setCapriniScore(6);
    setPaduaScore(4);
  };

  const buildSubmitInput = (values: FormValues): VteAnticoagSubmitInput => ({
    visitId: values.visitId,
    patientId: selectedVisit?.patientId,
    patientName: selectedVisit?.name,
    drug: values.drug,
    startDate: values.startDate.format('YYYY-MM-DD'),
    plannedDays: values.plannedDays,
    signature: values.signature.trim(),
    capriniScore,
    paduaScore,
    note: values.note,
  });

  const doSubmit = async (values: FormValues) => {
    try {
      const result = await submit(buildSubmitInput(values));
      if (result.demo) {
        message.warning('BFF 不可用，本次抗凝疗程已按本地演示记录留存，未写入业务库');
      } else {
        message.success(`抗凝疗程已启动：${VTE_DRUG_LABEL[result.record.drug]} · 计划 ${result.record.plannedDays} 天`);
      }
      form.resetFields();
      setSelectedVisit(null);
      await load();
    } catch {
      // error 已写入 store，由 Alert 统一展示
    }
  };

  /* ---------------- 出血评分 Modal ---------------- */

  const openBleeding = (r: VteAnticoagRecord) => {
    setBleedingRecord(r);
    bleedingForm.setFieldsValue({ score: r.bleedingScore ?? 0, reviewSignature: undefined });
  };

  const bleedingScoreWatch = Form.useWatch('score', bleedingForm);
  const highBleeding = bleedingScoreWatch != null && isHighBleedingRisk(bleedingScoreWatch);

  const onBleedingOk = async () => {
    if (!bleedingRecord) return;
    const values = await bleedingForm.validateFields();
    try {
      const result = await recordBleeding(bleedingRecord, {
        score: values.score,
        reviewSignature: values.reviewSignature?.trim(),
      });
      if (result.demo) {
        message.warning('BFF 不可用，出血评分已按本地演示记录留存，未写入业务库');
      } else if (isHighBleedingRisk(values.score)) {
        message.success(`出血评分 ${values.score} 分（高风险），已通知医师复核并生成待办`);
      } else {
        message.success(`出血评分已记录：${values.score} 分`);
      }
      setBleedingRecord(null);
      await load();
    } catch {
      // error 已写入 store，由 Alert 统一展示
    }
  };

  /* ---------------- 停用 Modal ---------------- */

  const openStop = (r: VteAnticoagRecord) => {
    setStopRecord(r);
    stopForm.setFieldsValue({ endDate: dayjs() });
  };

  const onStopOk = async () => {
    if (!stopRecord) return;
    const values = await stopForm.validateFields();
    try {
      const result = await stop(stopRecord, { endDate: values.endDate.format('YYYY-MM-DD') });
      if (result.demo) {
        message.warning('BFF 不可用，停用操作已按本地演示记录留存，未写入业务库');
      } else {
        message.success('抗凝疗程已停用');
      }
      setStopRecord(null);
      await load();
    } catch {
      // error 已写入 store，由 Alert 统一展示
    }
  };

  /* ---------------- 历史 Table ---------------- */

  const historyColumns = useMemo(
    () => [
      {
        title: '启动日期',
        dataIndex: 'startDate',
        render: (v: string) => (v ? dayjs(v).format('YYYY-MM-DD') : '—'),
      },
      {
        title: '患者',
        dataIndex: 'patientName',
        render: (v: string, r: VteAnticoagRecord) => v ?? r.visitId.slice(-6),
      },
      {
        title: '药品',
        dataIndex: 'drug',
        render: (d: VteDrug) => <Tag color="blue">{VTE_DRUG_LABEL[d]}</Tag>,
      },
      {
        title: '途径',
        dataIndex: 'drug',
        render: (d: VteDrug) => vteDrugRouteLabel(d),
      },
      {
        title: '计划天数',
        dataIndex: 'plannedDays',
        render: (v: number) => `${v} 天`,
      },
      {
        title: '疗程进度',
        render: (_: unknown, r: VteAnticoagRecord) => {
          const progress = courseProgress(r.startDate, r.plannedDays);
          return <Tag color={progress >= 100 ? 'green' : 'blue'}>{progress}%</Tag>;
        },
      },
      {
        title: '出血评分',
        dataIndex: 'bleedingScore',
        render: (v: number) => {
          const level = bleedingLevelOf(v);
          return (
            <Space size={4}>
              <Tag color={BLEEDING_COLOR[level]}>{v} 分 · {BLEEDING_LABEL[level]}</Tag>
              {isHighBleedingRisk(v) && <Tag color="red">需医师复核</Tag>}
            </Space>
          );
        },
      },
      {
        title: '状态',
        dataIndex: 'active',
        render: (_: unknown, r: VteAnticoagRecord) => {
          const status = deriveStatus(r);
          return <Tag color={VTE_STATUS_COLOR[status]}>{VTE_STATUS_LABEL[status]}</Tag>;
        },
      },
      {
        title: '操作',
        render: (_: unknown, r: VteAnticoagRecord) => {
          const status = deriveStatus(r);
          const actionable = status === 'active' || status === 'planned';
          return (
            <Space size={0}>
              <Button
                size="small"
                type="link"
                disabled={!canAct || !actionable}
                onClick={() => openBleeding(r)}
              >
                出血评分
              </Button>
              <Button
                size="small"
                type="link"
                disabled={!canAct || status !== 'active'}
                onClick={() => openStop(r)}
              >
                停用
              </Button>
              <Button size="small" type="link" onClick={() => setDetailRecord(r)}>
                查看
              </Button>
            </Space>
          );
        },
      },
    ],
    [canAct],
  );

  const detailStatus = detailRecord ? deriveStatus(detailRecord) : null;
  const detailLevel = detailRecord ? bleedingLevelOf(detailRecord.bleedingScore) : null;
  const detailProgress = detailRecord ? courseProgress(detailRecord.startDate, detailRecord.plannedDays) : 0;
  const detailMeta = detailRecord ? VTE_DRUGS[detailRecord.drug] : null;

  return (
    <PageContainer
      title="VTE 抗凝疗程管理"
      description="围术期 VTE 药物预防 · 疗程进度与出血风险闭环监测 · 高出血风险自动生成医师复核待办"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title="新建抗凝疗程" style={{ marginBottom: 16 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={doSubmit}
          requiredMark="optional"
          initialValues={{ signature: currentUser?.realName ?? '', startDate: dayjs() }}
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
                name="drug"
                label="抗凝药品"
                rules={[{ required: true, message: '请选择抗凝药品' }]}
              >
                <Select
                  placeholder="选择抗凝药品"
                  options={(Object.keys(VTE_DRUGS) as VteDrug[]).map((d) => ({
                    value: d,
                    label: VTE_DRUG_LABEL[d],
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="startDate"
                label="启动日期"
                rules={[{ required: true, message: '请选择启动日期' }]}
              >
                <DatePicker className="w-full" format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="plannedDays"
                label="计划疗程天数（1–90 天）"
                rules={[
                  { required: true, message: '请填写计划天数' },
                  { type: 'number', min: 1, max: 90, message: '计划天数须在 1–90 之间' },
                ]}
              >
                <InputNumber min={1} max={90} placeholder="如 14" className="w-full" />
              </Form.Item>
            </Col>
          </Row>

          {drugMeta && (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 12 }}
              message={`${drugMeta.genericName} · 规格 ${drugMeta.spec} · 单位 ${drugMeta.unit} · ${ROUTE_LABEL[drugMeta.route]} · 常用剂量：${drugMeta.dosage}`}
              description={
                <Space wrap size={4}>
                  <Typography.Text type="secondary">禁忌：</Typography.Text>
                  {drugMeta.contraindications.map((c) => (
                    <Tag key={c} color="red">{c}</Tag>
                  ))}
                </Space>
              }
            />
          )}

          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 12 }}
            message="VTE 风险评估（本地只读联动）"
            description={
              <Space wrap size={8}>
                <Tag color={VTE_LEVEL_COLOR[capriniLevel(capriniScore)]}>
                  Caprini {capriniScore} 分 · {VTE_LEVEL_LABEL[capriniLevel(capriniScore)]}
                </Tag>
                <Tag color={VTE_LEVEL_COLOR[paduaLevel(paduaScore)]}>
                  Padua {paduaScore} 分 · {VTE_LEVEL_LABEL[paduaLevel(paduaScore)]}
                </Tag>
                <Typography.Text type="secondary">
                  结论：高危，建议药物预防联合机械预防（IPC），用药前复核禁忌与出血风险。
                </Typography.Text>
              </Space>
            }
          />

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="signature"
                label="启动医师电子签名"
                rules={[
                  { required: true, message: '请签署启动医师姓名' },
                  { whitespace: true, message: '签名不能为空' },
                ]}
              >
                <Input placeholder="启动医师本人签名" maxLength={20} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="note" label="疗程备注">
            <TextArea rows={3} placeholder="既往血栓史、INR 监测、出血风险因素等补充说明" maxLength={500} showCount />
          </Form.Item>

          <Space>
            <Button type="primary" htmlType="submit" loading={acting} disabled={!canAct}>
              启动抗凝疗程
            </Button>
            {!canAct && (
              <Typography.Text type="secondary">当前账号缺少 vte:anticoagulate 权限，无法登记</Typography.Text>
            )}
          </Space>
        </Form>
      </Card>

      {canView ? (
        <Card size="small" title={`抗凝疗程记录${demo ? '（演示数据）' : ''}`}>
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
      ) : (
        <Alert type="warning" showIcon message="当前账号缺少 vte:view 权限，无法查看抗凝疗程历史" />
      )}

      <Modal
        open={bleedingRecord != null}
        title="记录出血评分"
        onCancel={() => setBleedingRecord(null)}
        onOk={onBleedingOk}
        okText="提交评分"
        confirmLoading={acting}
      >
        <Form form={bleedingForm} layout="vertical">
          <Form.Item
            label={`患者：${bleedingRecord?.patientName ?? bleedingRecord?.visitId.slice(-6)} · 药品：${bleedingRecord ? VTE_DRUG_LABEL[bleedingRecord.drug] : ''}`}
          >
            <Typography.Text type="secondary">出血评分 0–100；≥40 为高出血风险，须医师复核签名。</Typography.Text>
          </Form.Item>
          <Form.Item
            name="score"
            label="出血评分"
            rules={[
              { required: true, message: '请填写出血评分' },
              { type: 'number', min: 0, max: 100, message: '评分须在 0–100 之间' },
            ]}
          >
            <InputNumber min={0} max={100} placeholder="0–100" className="w-full" />
          </Form.Item>
          {highBleeding && (
            <Alert
              type="error"
              showIcon
              style={{ marginBottom: 12 }}
              message="高出血风险（≥40 分）"
              description="须由医师复核并签名确认，系统将自动生成复核待办。"
            />
          )}
          {highBleeding && (
            <Form.Item
              name="reviewSignature"
              label="医师复核签名"
              rules={[
                { required: true, message: '高出血风险须填写医师复核签名' },
                { whitespace: true, message: '签名不能为空' },
              ]}
            >
              <Input placeholder="复核医师本人签名" maxLength={20} />
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Modal
        open={stopRecord != null}
        title="停用抗凝疗程"
        onCancel={() => setStopRecord(null)}
        onOk={onStopOk}
        okText="确认停用"
        confirmLoading={acting}
      >
        <Form form={stopForm} layout="vertical">
          <Form.Item
            label={`患者：${stopRecord?.patientName ?? stopRecord?.visitId.slice(-6)} · 药品：${stopRecord ? VTE_DRUG_LABEL[stopRecord.drug] : ''}`}
          >
            <Typography.Text type="secondary">停用后疗程终止，不再继续给药；请确认停药日期。</Typography.Text>
          </Form.Item>
          <Form.Item
            name="endDate"
            label="停用日期"
            rules={[{ required: true, message: '请选择停用日期' }]}
          >
            <DatePicker className="w-full" format="YYYY-MM-DD" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={detailRecord != null}
        title="抗凝疗程详情"
        onCancel={() => setDetailRecord(null)}
        footer={<Button onClick={() => setDetailRecord(null)}>关闭</Button>}
      >
        {detailRecord && detailStatus && detailLevel && detailMeta && (
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <div>患者：{detailRecord.patientName ?? detailRecord.patientId} · 就诊：{detailRecord.visitId}</div>
            <div>药品：<Tag color="blue">{VTE_DRUG_LABEL[detailRecord.drug]}</Tag></div>
            <div>规格：{detailMeta.spec} · 单位：{detailMeta.unit} · 途径：{ROUTE_LABEL[detailMeta.route]} · 常用剂量：{detailMeta.dosage}</div>
            <div>
              禁忌：
              {detailMeta.contraindications.map((c) => (
                <Tag key={c} color="red">{c}</Tag>
              ))}
            </div>
            <div>
              疗程：{dayjs(detailRecord.startDate).format('YYYY-MM-DD')} 启动
              {detailRecord.endDate ? ` · ${dayjs(detailRecord.endDate).format('YYYY-MM-DD')} 停用` : ''}
              {' '}· 计划 {detailRecord.plannedDays} 天 · 进度 {detailProgress}%
            </div>
            <div>
              状态：<Tag color={VTE_STATUS_COLOR[detailStatus]}>{VTE_STATUS_LABEL[detailStatus]}</Tag>
              {' '}出血评分：<Tag color={BLEEDING_COLOR[detailLevel]}>{detailRecord.bleedingScore} 分 · {BLEEDING_LABEL[detailLevel]}</Tag>
              {isHighBleedingRisk(detailRecord.bleedingScore) && <Tag color="red">需医师复核</Tag>}
            </div>
            {detailRecord.capriniScore != null && (
              <div>
                风险评估：
                <Tag color={VTE_LEVEL_COLOR[capriniLevel(detailRecord.capriniScore)]}>
                  Caprini {detailRecord.capriniScore} 分 · {VTE_LEVEL_LABEL[capriniLevel(detailRecord.capriniScore)]}
                </Tag>
                {detailRecord.paduaScore != null && (
                  <Tag color={VTE_LEVEL_COLOR[paduaLevel(detailRecord.paduaScore)]}>
                    Padua {detailRecord.paduaScore} 分 · {VTE_LEVEL_LABEL[paduaLevel(detailRecord.paduaScore)]}
                  </Tag>
                )}
              </div>
            )}
            {detailRecord.signature && <div>启动医师：{detailRecord.signature}</div>}
            {detailRecord.reviewSignature && <div>复核医师：{detailRecord.reviewSignature}</div>}
            {detailRecord.reviewTaskId && <div>复核待办：{detailRecord.reviewTaskId}</div>}
            {detailRecord.note && <div>备注：{detailRecord.note}</div>}
            <div>登记时间：{dayjs(detailRecord.createdAt).format('YYYY-MM-DD HH:mm')}</div>
          </Space>
        )}
      </Modal>
    </PageContainer>
  );
}
