/**
 * 健澜科技 jlmedaios — 【系统集成深化】HL7 v2.x / FHIR R4 接口测试页（M155-C）
 *
 * 运维 / 集成工程师用于在浏览器内验证 HL7 报文解析与 FHIR R4 资源装配：
 *   1) 粘贴原始 HL7 报文（ADT^A04 / ORM^O01 / ORU^R01 / DFT^P03）→ 调
 *      POST /api/v1/integration/hl7/parse，展示结构化解析结果；
 *   2) 选择 FHIR 资源类型（Patient / Observation / MedicationRequest）并填
 *      入字段 → 调 POST /api/v1/integration/fhir/build，展示装配出的 R4 资源
 *      与必填字段校验结果。
 *
 * 【质量与合规】深海蓝 VI；本页仅做接口连通性与格式校验，不触发任何诊疗行为。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Input,
  Layout,
  Row,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import { ApiOutlined, BugOutlined } from '@ant-design/icons';
import { post } from '@/api/client';

const { Header, Content } = Layout;
const { TextArea } = Input;

/** 内置样例：ADT^A04 入院登记（|^~\& 分隔，段间 \n 仅为展示，后端按 0x0D 解析） */
const SAMPLE_ADT = [
  'MSH|^~\\&|HIS|健澜总院|EMR|健澜总院|20261016093000||ADT^A04|MSG000001|P|2.5.1',
  'EVN|A04|20261016093000',
  'PID|1||MRN20261001^健澜^^^MRN||张^三^^^Mr||19850312|F||2106-3|^^^健澜市^^310000',
  'PV1|1|I|INP^03^12^1|||000000^王医生^^^^DR',
].join('\n');

/** 内置样例：ORU^R01 检验结果 */
const SAMPLE_ORU = [
  'MSH|^~\\&|LIS|健澜总院|EMR|健澜总院|20261016100000||ORU^R01|MSG000002|P|2.5.1',
  'PID|1||MRN20261001||张^三',
  'OBR|1|||2951-2^收缩压^LN',
  'OBX|1|NM|2951-2^收缩压^LN||120|mmHg|||F',
  'OBX|2|NM|6690-2^舒张压^LN||80|mmHg|||F',
].join('\n');

interface ParsedResult {
  messageEvent: string;
  messageType: string;
  triggerEvent: string;
  messageControlId: string;
  sendingApplication: string;
  messageDateTime: string;
  patientId: string;
  patientName: string;
  administrativeSex: string;
  dateTimeOfBirth: string;
  visitNumber: string;
  segmentCount: number;
  observations: Array<{ code: string; display: string; value: string; unit: string }>;
  orders: Array<{ code: string; display: string; authoredOn: string }>;
  errors: string[];
}

interface BuildResult {
  resource: Record<string, unknown>;
  validation: { valid: boolean; errors: string[] } | null;
}

type ResourceType = 'Patient' | 'Observation' | 'MedicationRequest';

export default function Hl7TestPage() {
  const [rawMessage, setRawMessage] = useState(SAMPLE_ADT);
  const [parsed, setParsed] = useState<ParsedResult | null>(null);
  const [parsing, setParsing] = useState(false);

  const [resourceType, setResourceType] = useState<ResourceType>('Patient');
  const [buildData, setBuildData] = useState<Record<string, string>>({
    familyName: '张',
    givenNames: '三',
    identifier: 'MRN20261001',
    gender: 'female',
    birthDate: '1985-03-12',
    patientId: 'MRN20261001',
    code: '2951-2',
    codeDisplay: '收缩压',
    value: '120',
    unit: 'mmHg',
    effectiveDateTime: '2026-10-16T10:00:00',
    medicationCode: '04AA0',
    medicationDisplay: '阿莫西林',
    authoredOn: '2026-10-16T09:30:00',
  });
  const [built, setBuilt] = useState<BuildResult | null>(null);
  const [building, setBuilding] = useState(false);

  /** 调 /hl7/parse：把展示用 \n 还原为标准 0x0D */
  const onParse = async () => {
    setParsing(true);
    try {
      const raw = rawMessage.replace(/\n/g, '\r');
      const data = await post<{ parsed: ParsedResult; logged: boolean }>(
        '/api/v1/integration/hl7/parse',
        { rawMessage: raw, direction: 'inbound' },
      );
      setParsed(data.parsed);
      if (data.parsed.errors.length > 0) {
        message.warning(`解析完成，但有 ${data.parsed.errors.length} 个告警`);
      } else {
        message.success('HL7 报文解析成功');
      }
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'HL7 解析失败');
    } finally {
      setParsing(false);
    }
  };

  /** 按资源类型装配 FHIR 入参 */
  const buildPayload = () => {
    const d = buildData;
    if (resourceType === 'Patient') {
      return {
        resourceType,
        validate: true,
        data: {
          identifier: d.identifier,
          familyName: d.familyName,
          givenNames: d.givenNames ? d.givenNames.split(/[,，\s]+/).filter(Boolean) : [],
          gender: d.gender,
          birthDate: d.birthDate,
        },
      };
    }
    if (resourceType === 'Observation') {
      const num = Number(d.value);
      return {
        resourceType,
        validate: true,
        data: {
          patientId: d.patientId,
          code: d.code,
          codeDisplay: d.codeDisplay,
          value: Number.isNaN(num) ? d.value : num,
          unit: d.unit,
          effectiveDateTime: d.effectiveDateTime,
        },
      };
    }
    return {
      resourceType,
      validate: true,
      data: {
        patientId: d.patientId,
        medicationCode: d.medicationCode,
        medicationDisplay: d.medicationDisplay,
        authoredOn: d.authoredOn,
      },
    };
  };

  const onBuild = async () => {
    setBuilding(true);
    try {
      const data = await post<BuildResult>('/api/v1/integration/fhir/build', buildPayload());
      setBuilt(data);
      if (data.validation?.valid) message.success('FHIR R4 资源装配并通过校验');
      else message.warning('FHIR 资源已装配，但校验未通过');
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'FHIR 装配失败');
    } finally {
      setBuilding(false);
    }
  };

  const field = (key: string, placeholder: string) => (
    <Input
      placeholder={placeholder}
      value={buildData[key] ?? ''}
      onChange={(e) => setBuildData((prev) => ({ ...prev, [key]: e.target.value }))}
      allowClear
    />
  );

  return (
    <Layout className="min-h-screen bg-ink-bg">
      <Header className="flex items-center justify-between bg-jl-primary px-6 shadow-card">
        <div className="flex items-center gap-3">
          <ApiOutlined className="text-2xl text-white" />
          <Typography.Title level={4} className="!mb-0 !text-white">
            HL7 / FHIR 接口测试
          </Typography.Title>
          <span className="hidden text-sm text-white/70 md:block">
            HL7 v2.x（|^~\&amp;）解析 · FHIR R4 资源装配校验
          </span>
        </div>
        <Space>
          <Tag color="blue">ADT^A04</Tag>
          <Tag color="cyan">ORM^O01</Tag>
          <Tag color="green">ORU^R01</Tag>
          <Tag color="orange">DFT^P03</Tag>
        </Space>
      </Header>

      <Content className="p-4">
        <Row gutter={16}>
          {/* 左：HL7 解析 */}
          <Col xs={24} lg={12}>
            <Card
              title={<span><BugOutlined className="mr-2" />HL7 v2.x 报文解析</span>}
              className="mb-4 shadow-card"
              headStyle={{ background: '#f0f6fc', borderBottom: '2px solid #0A4D8C' }}
            >
              <Space className="mb-2">
                <Button size="small" onClick={() => setRawMessage(SAMPLE_ADT)}>
                  样例 ADT^A04
                </Button>
                <Button size="small" onClick={() => setRawMessage(SAMPLE_ORU)}>
                  样例 ORU^R01
                </Button>
              </Space>
              <TextArea
                rows={8}
                value={rawMessage}
                onChange={(e) => setRawMessage(e.target.value)}
                placeholder="粘贴 HL7 原始报文（段间以回车分隔）"
                style={{ fontFamily: 'monospace', fontSize: 12 }}
              />
              <Button
                type="primary"
                block
                className="mt-3"
                loading={parsing}
                onClick={onParse}
              >
                解析 HL7 报文
              </Button>

              {parsed && (
                <div className="mt-4">
                  {parsed.errors.length > 0 && (
                    <Alert
                      className="mb-2"
                      type="warning"
                      showIcon
                      message="解析告警"
                      description={parsed.errors.join('；')}
                    />
                  )}
                  <Descriptions
                    size="small"
                    column={2}
                    bordered
                    title={<span className="text-jl-primary">解析结果</span>}
                  >
                    <Descriptions.Item label="消息事件">
                      <Tag color="geekblue">{parsed.messageEvent || '—'}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="控制号">{parsed.messageControlId || '—'}</Descriptions.Item>
                    <Descriptions.Item label="发送方">{parsed.sendingApplication || '—'}</Descriptions.Item>
                    <Descriptions.Item label="消息时间">{parsed.messageDateTime || '—'}</Descriptions.Item>
                    <Descriptions.Item label="患者ID">{parsed.patientId || '—'}</Descriptions.Item>
                    <Descriptions.Item label="患者姓名">{parsed.patientName || '—'}</Descriptions.Item>
                    <Descriptions.Item label="性别">{parsed.administrativeSex || '—'}</Descriptions.Item>
                    <Descriptions.Item label="就诊号">{parsed.visitNumber || '—'}</Descriptions.Item>
                  </Descriptions>

                  {parsed.observations.length > 0 && (
                    <div className="mt-3">
                      <Typography.Text strong className="text-jl-primary">检验结果（OBX）</Typography.Text>
                      {parsed.observations.map((o, i) => (
                        <Tag key={i} className="mt-1">
                          {o.display}({o.code}) = {o.value} {o.unit}
                        </Tag>
                      ))}
                    </div>
                  )}
                  {parsed.orders.length > 0 && (
                    <div className="mt-3">
                      <Typography.Text strong className="text-jl-primary">医嘱（OBR）</Typography.Text>
                      {parsed.orders.map((o, i) => (
                        <Tag key={i} color="cyan" className="mt-1">
                          {o.display}({o.code}) @ {o.authoredOn}
                        </Tag>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          </Col>

          {/* 右：FHIR R4 装配 */}
          <Col xs={24} lg={12}>
            <Card
              title={<span><ApiOutlined className="mr-2" />FHIR R4 资源装配与校验</span>}
              className="shadow-card"
              headStyle={{ background: '#f0f6fc', borderBottom: '2px solid #0A4D8C' }}
            >
              <Select
                className="mb-3 w-full"
                value={resourceType}
                onChange={(v) => setResourceType(v)}
                options={[
                  { value: 'Patient', label: 'Patient 患者' },
                  { value: 'Observation', label: 'Observation 观察/检验' },
                  { value: 'MedicationRequest', label: 'MedicationRequest 用药请求' },
                ]}
              />

              {resourceType === 'Patient' && (
                <Row gutter={[8, 8]}>
                  <Col span={12}>{field('familyName', '姓 family')}</Col>
                  <Col span={12}>{field('givenNames', '名 given（逗号分隔）')}</Col>
                  <Col span={12}>{field('identifier', 'MRN 病历号')}</Col>
                  <Col span={12}>{field('gender', 'male/female/other/unknown')}</Col>
                  <Col span={24}>{field('birthDate', '出生日期 YYYY-MM-DD')}</Col>
                </Row>
              )}
              {resourceType === 'Observation' && (
                <Row gutter={[8, 8]}>
                  <Col span={12}>{field('patientId', '患者ID（Patient 引用）')}</Col>
                  <Col span={12}>{field('code', 'LOINC 代码')}</Col>
                  <Col span={12}>{field('codeDisplay', '项目名称')}</Col>
                  <Col span={12}>{field('value', '结果值')}</Col>
                  <Col span={12}>{field('unit', '单位（UCUM）')}</Col>
                  <Col span={12}>{field('effectiveDateTime', '结果时间 ISO')}</Col>
                </Row>
              )}
              {resourceType === 'MedicationRequest' && (
                <Row gutter={[8, 8]}>
                  <Col span={12}>{field('patientId', '患者ID（Patient 引用）')}</Col>
                  <Col span={12}>{field('medicationCode', '药品代码 ATC')}</Col>
                  <Col span={12}>{field('medicationDisplay', '药品名称')}</Col>
                  <Col span={12}>{field('authoredOn', '开嘱时间 ISO')}</Col>
                </Row>
              )}

              <Button type="primary" block className="mt-3" loading={building} onClick={onBuild}>
                装配 FHIR 资源并校验
              </Button>

              {built && (
                <div className="mt-4">
                  <Alert
                    className="mb-2"
                    type={built.validation?.valid ? 'success' : 'error'}
                    showIcon
                    message={
                      built.validation?.valid
                        ? 'FHIR R4 资源通过必填字段校验'
                        : `校验未通过：${built.validation?.errors.join('；')}`
                    }
                  />
                  <TextArea
                    rows={10}
                    readOnly
                    value={JSON.stringify(built.resource, null, 2)}
                    style={{ fontFamily: 'monospace', fontSize: 12, background: '#fafafa' }}
                  />
                </div>
              )}
            </Card>
          </Col>
        </Row>

        <Alert
          className="mt-4"
          type="info"
          showIcon
          message="【质量与合规】本页仅用于院内外系统接口的连通性与格式验证；HL7 报文可能含患者敏感信息，请勿粘贴真实生产数据；所有报文已按审计要求留痕至 integ.hl7_message_log。"
        />
      </Content>
    </Layout>
  );
}
