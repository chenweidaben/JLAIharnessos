/**
 * 健澜科技 jlmedaios - M174-B 系统集成深化·二期：标准接口扩展控制台（仅 admin）
 *
 * 【系统集成要标准合规，不自创格式】本页是院内外标准接口的联调/测试台：
 *   - HL7 v2.x（2.5.1）扩展事件：ADT^A08 患者信息更新 / ORM^O02 医嘱修改 /
 *     ORU^R30 观察结果上传（检验仪器 -> LIS -> 院端）；
 *   - FHIR R4：Patient / Encounter / Observation / MedicationRequest / Condition；
 *   - DICOM 3.0：影像设备对接（C-STORE/C-FIND/C-MOVE，按 SOP Class UID 校验）；
 *   - LIS 双向：主机查询医嘱 / 仪器结果上传。
 *
 * 「持续优化与新场景」：能力矩阵直接取自 BFF buildDeepIntegration()，新增标准族
 *   后本页自动展示，无需改前端。
 * 视觉：深海蓝 VI（#0a2540 -> #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Layout,
  Row,
  Segmented,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/* ---------------- 与 BFF 输出对齐的类型 ---------------- */

type Standard = 'hl7v2x' | 'fhir-r4' | 'dicom' | 'lis';
type FHIRType = 'Patient' | 'Encounter' | 'Observation' | 'MedicationRequest' | 'Condition';

interface Capability {
  module: string;
  compliance: string;
  standards: Array<{ code: Standard; version: string; detail: string }>;
  hl7Events: string[];
  fhirResources: FHIRType[];
  dicomSopClasses: Array<{ uid: string; name: string }>;
  lisDirections: string[];
}

interface DeepResp {
  capability: Capability;
  standard: Standard;
  parsed?: Record<string, unknown>;
  resource?: Record<string, unknown>;
  descriptor?: Record<string, unknown>;
  fhir?: Record<string, unknown> | null;
  validation: { valid: boolean; standard: Standard; errors: string[] };
  logged: boolean;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

/* ---------------- 预置样例（联调即点即测） ---------------- */

const SEG = '\r';
const HL7_PRESETS: Record<string, string> = {
  'ADT^A08 患者信息更新': [
    'MSH|^~\\&|HIS|健澜总院|EMR|健澜总院|20261016093000||ADT^A08|MSG001001|P|2.5.1',
    'PID|1||MRN20261001^健澜^^^MRN||张^三^^^Mr||19850312|F|||文一西路969号^^杭州市^^310012||057188888888',
    'PV1|1|I|INP^03^12^1|||000000^王医生^^^^DR|||||||||||||VISIT20261001',
  ].join(SEG),
  'ORM^O02 医嘱修改': [
    'MSH|^~\\&|HIS|健澜总院|PHARM|健澜总院|20261016110000||ORM^O02|MSG001002|P|2.5.1',
    'PID|1||MRN20261001||张^三',
    'ORC|XO|ORD2026001|||9|20261016110000',
    'OBR|1|||04AA0^阿莫西林^ATC',
  ].join(SEG),
  'ORU^R30 观察结果上传': [
    'MSH|^~\\&|LIS|健澜总院|EMR|健澜总院|20261016100000||ORU^R30|MSG001003|P|2.5.1',
    'PID|1||MRN20261001||张^三',
    'OBR|1|||2951-2^收缩压^LN',
    'OBX|1|NM|2951-2^收缩压^LN||120|mmHg|||F',
    'OBX|2|NM|6690-2^舒张压^LN||80|mmHg|||F',
  ].join(SEG),
};

const FHIR_DATA_PRESETS: Record<FHIRType, Record<string, unknown>> = {
  Patient: { patientId: 'MRN20261001', familyName: '张', givenNames: ['三'], gender: 'female', birthDate: '1985-03-12' },
  Encounter: { patientId: 'MRN20261001', encounterClass: 'IMP', periodStart: '2026-10-16T09:30:00', serviceProvider: '心内科' },
  Observation: { patientId: 'MRN20261001', code: '2951-2', codeDisplay: '收缩压', value: 120, unit: 'mmHg', effectiveDateTime: '2026-10-16T10:00:00' },
  MedicationRequest: { patientId: 'MRN20261001', medicationCode: '04AA0', medicationDisplay: '阿莫西林', authoredOn: '2026-10-16T11:00:00' },
  Condition: { patientId: 'MRN20261001', conditionCode: 'I10.x', conditionDisplay: '原发性高血压', onsetDateTime: '2026-10-16T09:30:00' },
};

const DICOM_PRESET = {
  sopClassUid: '1.2.840.10008.5.1.4.1.1.2',
  modality: 'CT',
  studyInstanceUid: '1.2.840.114342.2026.10.16.001',
  patientId: 'MRN20261001',
};

const LIS_PRESET = {
  host: 'LIS-HIS',
  instrumentCode: '01-CBC-5800',
  instrumentName: '全自动血球分析仪',
  bidirectional: true,
  supportedQueries: ['order_query', 'result_upload'],
};

const STANDARD_TABS: Array<{ label: string; value: Standard }> = [
  { label: 'HL7 v2.x 扩展', value: 'hl7v2x' },
  { label: 'FHIR R4', value: 'fhir-r4' },
  { label: 'DICOM 影像', value: 'dicom' },
  { label: 'LIS 双向', value: 'lis' },
];

export default function IntegrationDeepPage() {
  const [standard, setStandard] = useState<Standard>('hl7v2x');
  const [hl7Input, setHl7Input] = useState<string>(HL7_PRESETS['ADT^A08 患者信息更新']);
  const [fhirType, setFhirType] = useState<FHIRType>('Patient');
  const [fhirData, setFhirData] = useState<string>(JSON.stringify(FHIR_DATA_PRESETS.Patient, null, 2));
  const [descInput, setDescInput] = useState<string>(JSON.stringify(DICOM_PRESET, null, 2));

  const [result, setResult] = useState<DeepResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (standard === 'dicom') setDescInput(JSON.stringify(DICOM_PRESET, null, 2));
    if (standard === 'lis') setDescInput(JSON.stringify(LIS_PRESET, null, 2));
  }, [standard]);

  useEffect(() => {
    setFhirData(JSON.stringify(FHIR_DATA_PRESETS[fhirType], null, 2));
  }, [fhirType]);

  const run = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      let body: Record<string, unknown> = { standard };
      if (standard === 'hl7v2x') {
        body = { ...body, rawMessage: hl7Input };
      } else if (standard === 'fhir-r4') {
        body = { ...body, resourceType: fhirType, data: JSON.parse(fhirData) };
      } else {
        body = { ...body, data: JSON.parse(descInput) };
      }
      const resp = await fetch('/api/v1/integration/deep/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '请求失败');
        setResult(null);
        return;
      }
      setResult(json.data as DeepResp);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常/JSON 格式错误');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [standard, hl7Input, fhirType, fhirData, descInput]);

  const capability = result?.capability;
  const validation = result?.validation;

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      {/* 深海蓝头部横幅 */}
      <div style={{ background: `linear-gradient(135deg, ${VI.deep} 0%, ${VI.mid} 100%)`, padding: '24px 32px' }}>
        <Title level={3} style={{ color: '#fff', margin: 0 }}>
          系统集成深化 · 标准接口扩展
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          HL7 v2.x / FHIR R4 / DICOM / LIS 双向 · 严格遵循现行标准，不自创格式 · 仅 admin
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          {/* 标准族切换 */}
          <Card>
            <Segmented options={STANDARD_TABS} value={standard} onChange={(v) => setStandard(v as Standard)} />
          </Card>

          {/* 输入区 */}
          <Card title="报文 / 资源输入" bordered={false}>
            {standard === 'hl7v2x' && (
              <>
                <Space wrap style={{ marginBottom: 12 }}>
                  {Object.keys(HL7_PRESETS).map((k) => (
                    <Button key={k} size="small" onClick={() => setHl7Input(HL7_PRESETS[k])}>
                      {k}
                    </Button>
                  ))}
                </Space>
                <textarea
                  style={{
                    width: '100%',
                    minHeight: 140,
                    fontFamily: 'monospace',
                    fontSize: 12,
                    padding: 8,
                    border: '1px solid #d9d9d9',
                    borderRadius: 6,
                  }}
                  value={hl7Input}
                  onChange={(e) => setHl7Input(e.target.value)}
                />
              </>
            )}

            {standard === 'fhir-r4' && (
              <>
                <Select
                  style={{ width: 260, marginBottom: 12 }}
                  value={fhirType}
                  onChange={(v) => setFhirType(v as FHIRType)}
                  options={(result?.capability?.fhirResources ?? [
                    'Patient',
                    'Encounter',
                    'Observation',
                    'MedicationRequest',
                    'Condition',
                  ]).map((r) => ({ label: r, value: r }))}
                />
                <textarea
                  style={{
                    width: '100%',
                    minHeight: 160,
                    fontFamily: 'monospace',
                    fontSize: 12,
                    padding: 8,
                    border: '1px solid #d9d9d9',
                    borderRadius: 6,
                  }}
                  value={fhirData}
                  onChange={(e) => setFhirData(e.target.value)}
                />
              </>
            )}

            {(standard === 'dicom' || standard === 'lis') && (
              <textarea
                style={{
                  width: '100%',
                  minHeight: 160,
                  fontFamily: 'monospace',
                  fontSize: 12,
                  padding: 8,
                  border: '1px solid #d9d9d9',
                  borderRadius: 6,
                }}
                value={descInput}
                onChange={(e) => setDescInput(e.target.value)}
              />
            )}

            <div style={{ marginTop: 12 }}>
              <Button type="primary" loading={loading} onClick={run} style={{ background: VI.accent }}>
                {standard === 'hl7v2x' ? '解析 + 校验' : standard === 'fhir-r4' ? '构建 + 校验' : '校验标准合规'}
              </Button>
            </div>
          </Card>

          {loading && (
            <div style={{ textAlign: 'center', padding: 32 }}>
              <Spin size="large" tip="正在按标准解析/校验…" />
            </div>
          )}

          {error && <Alert type="error" showIcon message={error} />}

          {/* 结果区 */}
          {!loading && !error && result && (
            <>
              <Card>
                <Space>
                  <Text strong>标准合规：</Text>
                  {validation?.valid ? <Tag color="green">通过</Tag> : <Tag color="red">未通过</Tag>}
                  {result.logged !== undefined && (
                    <Tag color={result.logged ? 'blue' : 'default'}>{result.logged ? '已留痕' : '演示模式未落库'}</Tag>
                  )}
                </Space>
                {validation && validation.errors.length > 0 && (
                  <Alert style={{ marginTop: 12 }} type="warning" showIcon message={validation.errors.join('；')} />
                )}
              </Card>

              <Row gutter={16}>
                <Col span={12}>
                  <Card title="解析 / 装配结果" size="small" style={{ height: '100%' }}>
                    <pre style={{ maxHeight: 360, overflow: 'auto', fontSize: 12, margin: 0 }}>
                      {JSON.stringify(result.parsed ?? result.resource ?? result.fhir ?? result.descriptor ?? {}, null, 2)}
                    </pre>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card title="能力清单（buildDeepIntegration）" size="small" style={{ height: '100%' }}>
                    <Table
                      rowKey="code"
                      pagination={false}
                      size="small"
                      dataSource={capability?.standards ?? []}
                      columns={[
                        { title: '标准', dataIndex: 'code', width: 90 },
                        { title: '版本', dataIndex: 'version', width: 110 },
                        { title: '对接内容', dataIndex: 'detail' },
                      ]}
                    />
                    {capability && (
                      <div style={{ marginTop: 8 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {capability.compliance}
                        </Text>
                      </div>
                    )}
                  </Card>
                </Col>
              </Row>
            </>
          )}
        </Space>
      </Content>
    </Layout>
  );
}
