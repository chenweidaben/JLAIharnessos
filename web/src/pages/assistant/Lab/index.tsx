/**
 * 健澜科技 jlmedaios - 检验检查智能解读面板（M121-C）
 *
 * 医师输入患者 ID 与本次检验结果（JSON），POST /api/v1/assistant/lab/interpret，
 * 展示：异常指标 / 趋势分析 / 可能原因 / 随访建议 四区块。
 *
 * 三态完备：loading（Spin）、error（Alert + 重试）、empty（未查询 / 无数据）。
 * 视觉：深海蓝 VI（主色 #0B3D6B，辅底 #E8F0F8）。
 *
 * 定位：AI 辅助解读，possibleCauses 为"可能方向"而非诊断；危急值须立即人工复核。
 * 数据安全要求：依据宪法第七章，患者标识服务端脱敏返回，本页不展示明文 ID。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import {
  Alert, Button, Card, Col, Empty, Input, Layout, List, Row, Spin, Table, Tag, Typography, message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ExperimentOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { post } from '@/services/request';

const { Header, Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/** 深海蓝 VI */
const DEEP_SEA = '#0B3D6B';
const DEEP_SEA_BG = '#E8F0F8';

interface LabResultItem {
  markerCode: string;
  markerName: string;
  value: number;
  unit: string;
  refLow?: number | null;
  refHigh?: number | null;
}

type AbnormalFlag = 'high' | 'low' | 'critical_high' | 'critical_low';

interface AbnormalMarker {
  markerCode: string;
  markerName: string;
  value: number;
  unit: string;
  refLow: number | null;
  refHigh: number | null;
  flag: AbnormalFlag;
  deviationPct: number;
}

interface MarkerTrend {
  markerCode: string;
  markerName: string;
  unit: string;
  currentValue: number;
  previousValue: number | null;
  changePct: number | null;
  direction: 'up' | 'down' | 'flat' | 'new';
}

interface MarkerCause {
  markerCode: string;
  markerName: string;
  flag: AbnormalFlag | 'normal';
  causes: string[];
}

interface FollowUpSuggestion {
  priority: 'high' | 'medium' | 'low';
  title: string;
  detail: string;
  action: string;
}

interface LabInterpretationResult {
  doctorId: string;
  patientIdMasked: string;
  abnormalMarkers: AbnormalMarker[];
  trends: MarkerTrend[];
  possibleCauses: MarkerCause[];
  followUpSuggestions: FollowUpSuggestion[];
  generatedAt: string;
  disclaimer: string;
}

const FLAG_TAG: Record<AbnormalFlag, { color: string; label: string }> = {
  critical_high: { color: 'red', label: '危急↑' },
  critical_low: { color: 'red', label: '危急↓' },
  high: { color: 'orange', label: '偏高' },
  low: { color: 'blue', label: '偏低' },
};

const PRIORITY_TAG: Record<FollowUpSuggestion['priority'], { color: string; label: string }> = {
  high: { color: 'red', label: '紧急' },
  medium: { color: 'orange', label: '建议' },
  low: { color: 'green', label: '常规' },
};

const DIRECTION_TAG: Record<MarkerTrend['direction'], { color: string; label: string }> = {
  up: { color: 'orange', label: '↑ 上升' },
  down: { color: 'blue', label: '↓ 下降' },
  flat: { color: 'default', label: '— 持平' },
  new: { color: 'purple', label: '新指标' },
};

/** 示例数据（便于医师快速体验；可自由编辑） */
const SAMPLE_RESULTS = JSON.stringify([
  { markerCode: 'WBC', markerName: '白细胞', value: 13.5, unit: '10^9/L', refLow: 4, refHigh: 10 },
  { markerCode: 'HGB', markerName: '血红蛋白', value: 98, unit: 'g/L', refLow: 115, refHigh: 150 },
  { markerCode: 'PLT', markerName: '血小板', value: 230, unit: '10^9/L', refLow: 100, refHigh: 300 },
  { markerCode: 'CRP', markerName: 'C反应蛋白', value: 45, unit: 'mg/L', refLow: 0, refHigh: 10 },
], null, 2);

const SAMPLE_PREV = JSON.stringify([
  { markerCode: 'WBC', markerName: '白细胞', value: 9.8, unit: '10^9/L' },
  { markerCode: 'HGB', markerName: '血红蛋白', value: 110, unit: 'g/L' },
], null, 2);

/** 调用 BFF：POST /api/v1/assistant/lab/interpret（baseURL 已含前缀） */
function interpretLab(patientId: string, results: LabResultItem[], prevResults: LabResultItem[]) {
  return post<LabInterpretationResult>('/assistant/lab/interpret', { patientId, results, prevResults });
}

const abnormalColumns: ColumnsType<AbnormalMarker> = [
  { title: '项目', dataIndex: 'markerName', key: 'markerName', render: (v: string, r) => (
    <span><Text strong>{v}</Text> <Text type="secondary">({r.markerCode})</Text></span>
  ) },
  { title: '结果', dataIndex: 'value', key: 'value', render: (v: number, r) => `${v} ${r.unit}` },
  { title: '参考范围', key: 'ref', render: (_: unknown, r) => {
    if (r.refLow == null && r.refHigh == null) return <Text type="secondary">—</Text>;
    return `${r.refLow ?? ''} ~ ${r.refHigh ?? ''}`;
  } },
  { title: '异常', dataIndex: 'flag', key: 'flag', render: (f: AbnormalFlag) => <Tag color={FLAG_TAG[f].color}>{FLAG_TAG[f].label}</Tag> },
  { title: '偏离', dataIndex: 'deviationPct', key: 'deviationPct', render: (v: number) => `${v > 0 ? '+' : ''}${v}%` },
];

export default function LabInterpretationPage() {
  const [patientId, setPatientId] = useState('');
  const [resultsText, setResultsText] = useState('');
  const [prevText, setPrevText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<LabInterpretationResult | null>(null);
  const [queried, setQueried] = useState(false);

  const runInterpret = async () => {
    const pid = patientId.trim();
    if (!pid) { message.warning('请输入患者 ID'); return; }
    let results: LabResultItem[];
    let prevResults: LabResultItem[] = [];
    try {
      results = JSON.parse(resultsText) as LabResultItem[];
      if (!Array.isArray(results) || results.length === 0) throw new Error('results 须为非空数组');
      if (prevText.trim()) prevResults = JSON.parse(prevText) as LabResultItem[];
    } catch (e) {
      setError(`检验结果 JSON 格式错误：${e instanceof Error ? e.message : String(e)}`);
      return;
    }
    setLoading(true);
    setError(null);
    setQueried(true);
    try {
      const res = await interpretLab(pid, results, prevResults);
      setData(res);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const criticalCount = data ? data.abnormalMarkers.filter((m) => m.flag.startsWith('critical')).length : 0;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: DEEP_SEA, display: 'flex', alignItems: 'center' }}>
        <Title level={4} style={{ color: '#fff', margin: 0 }}>检验检查智能解读</Title>
      </Header>
      <Content style={{ padding: 24, background: DEEP_SEA_BG }}>
        {/* 输入区 */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={6}>
              <Input
                placeholder="患者 ID（仅服务端使用，展示脱敏）"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                allowClear
              />
            </Col>
            <Col span={12}>
              <Input.TextArea
                rows={3}
                placeholder='本次检验结果 JSON，如 [{"markerCode":"WBC","markerName":"白细胞","value":13.5,"unit":"10^9/L","refLow":4,"refHigh":10}]'
                value={resultsText}
                onChange={(e) => setResultsText(e.target.value)}
              />
            </Col>
            <Col span={6}>
              <Input.TextArea
                rows={3}
                placeholder="既往结果 JSON（可选，用于趋势分析）"
                value={prevText}
                onChange={(e) => setPrevText(e.target.value)}
              />
            </Col>
          </Row>
          <Row gutter={16} style={{ marginTop: 12 }} align="middle">
            <Col>
              <Button type="primary" icon={<ExperimentOutlined />} loading={loading} onClick={() => void runInterpret()}>
                开始智能解读
              </Button>
            </Col>
            <Col>
              <Button
                size="small"
                onClick={() => { setResultsText(SAMPLE_RESULTS); setPrevText(SAMPLE_PREV); setPatientId('pat_demo_0001'); }}
              >
                填入示例
              </Button>
            </Col>
          </Row>
        </Card>

        {/* loading 态 */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 64 }}>
            <Spin size="large" tip="正在分析检验结果…" />
          </div>
        )}

        {/* error 态 */}
        {!loading && error && (
          <Alert
            type="error" showIcon
            message="智能解读失败"
            description={error}
            action={<Button size="small" onClick={() => void runInterpret()}>重试</Button>}
          />
        )}

        {/* empty 态 */}
        {!loading && !error && !data && (
          <Card>
            <Empty description={queried ? '该患者本次无可解读的检验结果' : '输入患者 ID 与检验结果 JSON，开始智能解读'} />
          </Card>
        )}

        {/* 数据态 */}
        {!loading && !error && data && (
          <>
            {/* 结论条 */}
            <Card style={{ marginBottom: 16 }}>
              <Row gutter={16} align="middle">
                <Col flex="auto">
                  <Title level={5} style={{ marginBottom: 4 }}>
                    患者 {data.patientIdMasked}
                    <Tag color={criticalCount > 0 ? 'red' : data.abnormalMarkers.length > 0 ? 'orange' : 'green'} style={{ marginLeft: 12 }}>
                      {criticalCount > 0 ? `${criticalCount} 项危急` : data.abnormalMarkers.length > 0 ? `${data.abnormalMarkers.length} 项异常` : '未见异常'}
                    </Tag>
                  </Title>
                  <Paragraph type="secondary" style={{ marginBottom: 0 }}>{data.disclaimer}</Paragraph>
                </Col>
                <Col>
                  <Text type="secondary">解读时间 {data.generatedAt.slice(0, 19).replace('T', ' ')}</Text>
                </Col>
              </Row>
            </Card>

            <Row gutter={16}>
              {/* 异常指标 */}
              <Col span={12} style={{ marginBottom: 16 }}>
                <Card title="异常指标检测" size="small">
                  {data.abnormalMarkers.length === 0 ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="全部指标在参考范围内" />
                  ) : (
                    <Table size="small" rowKey="markerCode" columns={abnormalColumns} dataSource={data.abnormalMarkers} pagination={false} />
                  )}
                </Card>
              </Col>

              {/* 随访建议 */}
              <Col span={12} style={{ marginBottom: 16 }}>
                <Card title="随访建议" size="small">
                  <List
                    size="small"
                    dataSource={data.followUpSuggestions}
                    renderItem={(item) => (
                      <List.Item>
                        <Tag color={PRIORITY_TAG[item.priority].color}>{PRIORITY_TAG[item.priority].label}</Tag>
                        <div>
                          <Text strong>{item.title}</Text>
                          <Paragraph type="secondary" style={{ marginBottom: 0 }}>{item.detail}</Paragraph>
                          <Text type="warning">建议：{item.action}</Text>
                        </div>
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>

              {/* 趋势分析 */}
              <Col span={12} style={{ marginBottom: 16 }}>
                <Card title="趋势分析（对比既往）" size="small">
                  <List
                    size="small"
                    dataSource={data.trends}
                    renderItem={(item) => (
                      <List.Item>
                        <Tag color={DIRECTION_TAG[item.direction].color}>{DIRECTION_TAG[item.direction].label}</Tag>
                        <div>
                          <Text strong>{item.markerName}</Text>
                          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                            本次 {item.currentValue}{item.unit}
                            {item.previousValue != null ? `；既往 ${item.previousValue}${item.unit}（${item.changePct != null ? `${item.changePct > 0 ? '+' : ''}${item.changePct}%` : '—'}）` : '；无既往对照'}
                          </Paragraph>
                        </div>
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>

              {/* 可能原因 */}
              <Col span={12} style={{ marginBottom: 16 }}>
                <Card title="可能原因（非诊断）" size="small">
                  {data.possibleCauses.length === 0 ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="无异常指标，无需列可能原因" />
                  ) : (
                    <List
                      size="small"
                      dataSource={data.possibleCauses}
                      renderItem={(item) => (
                        <List.Item>
                          <Tag color={FLAG_TAG[item.flag as AbnormalFlag]?.color ?? 'default'}>
                            {item.markerName}
                          </Tag>
                          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                            {item.causes.join('；')}
                          </Paragraph>
                        </List.Item>
                      )}
                    />
                  )}
                </Card>
              </Col>
            </Row>
          </>
        )}
      </Content>
    </Layout>
  );
}
