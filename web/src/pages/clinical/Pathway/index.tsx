/**
 * 健澜科技 jlmedaios - 临床路径智能推荐工作站（M153-A）
 *
 * 【临床决策支持】CDS：按诊断/年龄/共病推荐临床路径，展示按天步骤、基准费用与偏离分析。
 * 合规：推荐不是强制，医生可根据实际情况偏离；页面全程展示免责声明，AI 不自主开医嘱。
 * 视觉：深海蓝 VI（bg-jl-primary）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 */

import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  InputNumber,
  Layout,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Steps,
  Table,
  Tag,
  Typography,
  Watermark,
} from 'antd';
import { ExperimentOutlined } from '@ant-design/icons';
import { get } from '@/services/request';

const { Header, Content } = Layout;
const watermarkText = ['健澜科技', '临床路径推荐', 'jlmedaios'];

/** 与 BFF aggregator 输出对齐 */
interface PathwayStep {
  day: number;
  name: string;
  action: string;
}
interface CostItem {
  name: string;
  amountCny: number;
}
interface PathwayResult {
  pathwayId: string;
  pathwayCode: string;
  name: string;
  icdCode: string;
  standardLosDays: number;
  steps: PathwayStep[];
  costBreakdown: CostItem[];
  estimatedCostCny: number;
  confidence: number;
  rationale: string[];
  disclaimer: string;
}
interface DeviationResult {
  visitId: string;
  pathwayId: string;
  isDeviated: boolean;
  deviationRate: number;
  items: { expected: string; actual: string; deviationType: string }[];
  note: string;
}

const DISEASE_OPTIONS = [
  { value: '冠心病急性冠脉综合征，拟行冠脉支架置入', label: '冠心病：急性心梗/支架(PCI)' },
  { value: '冠心病，高龄，拟药物保守治疗', label: '冠心病：高龄/药物保守' },
  { value: '社区获得性肺炎', label: '肺炎：社区获得性(CAP)' },
  { value: '医院获得性肺炎，卧床机械通气中', label: '肺炎：院内获得性(HAP)' },
  { value: '2型糖尿病', label: '糖尿病：2型' },
  { value: '妊娠糖尿病', label: '糖尿病：妊娠(GDM)' },
  { value: '胆囊结石胆囊炎，拟腹腔镜胆囊切除术', label: '胆囊切除术(LC)' },
];

const COMORBIDITY_OPTIONS = ['高血压', '心衰', '肾功能不全', '糖尿病', '肿瘤', '出血倾向', '卧床', '冠心病', '慢性阻塞性肺疾病'];

export default function ClinicalPathwayPage() {
  const [disease, setDisease] = useState<string>(DISEASE_OPTIONS[0].value);
  const [age, setAge] = useState<number>(62);
  const [comorbidities, setComorbidities] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [pathway, setPathway] = useState<PathwayResult | null>(null);
  const [deviation, setDeviation] = useState<DeviationResult | null>(null);
  const [error, setError] = useState<string>('');

  const onRecommend = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await get<{ pathway: PathwayResult }>('/api/v1/clinical-pathway/recommend', {
        disease,
        patientAge: age,
        comorbidities: comorbidities.join(','),
      });
      setPathway(res.pathway);
      // 以示例就诊ID拉取偏离分析（演示：当前就诊默认无偏离记录）
      try {
        const dev = await get<{ deviation: DeviationResult }>('/api/v1/clinical-pathway/deviation', {
          visitId: 'demo-visit-0001',
          pathwayId: res.pathway.pathwayId,
        });
        setDeviation(dev.deviation);
      } catch {
        setDeviation(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '推荐失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Watermark content={watermarkText}>
      <Layout className="min-h-screen bg-ink-bg">
        <Header className="flex items-center justify-between bg-jl-primary px-6 shadow-card">
          <div className="flex items-center gap-3">
            <ExperimentOutlined className="text-2xl text-white" />
            <Typography.Title level={4} className="!mb-0 !text-white">
              临床路径智能推荐
            </Typography.Title>
            <span className="hidden text-sm text-white/70 md:block">
              【临床决策支持】按病种推荐路径 · 基准费用 · 偏离分析 · 医生可偏离
            </span>
          </div>
          <Tag color="cyan">CDS · 非强制</Tag>
        </Header>

        <Content className="p-4">
          <Alert
            type="info"
            showIcon
            className="mb-3"
            message="临床决策支持：本页推荐路径仅供参考，医生可根据实际情况偏离；不替代医师临床判断，系统不自主开医嘱。"
          />

          <Card size="small" title="推荐条件（诊断 / 年龄 / 共病）" className="mb-3">
            <Form layout="inline">
              <Form.Item label="诊断">
                <Select
                  style={{ width: 320 }}
                  value={disease}
                  onChange={setDisease}
                  options={DISEASE_OPTIONS}
                />
              </Form.Item>
              <Form.Item label="年龄">
                <InputNumber min={0} max={130} value={age} onChange={(v) => setAge(v ?? 0)} />
              </Form.Item>
              <Form.Item label="共病">
                <Select
                  mode="tags"
                  style={{ minWidth: 260 }}
                  placeholder="选择或输入共病"
                  value={comorbidities}
                  onChange={setComorbidities}
                  options={COMORBIDITY_OPTIONS.map((c) => ({ value: c, label: c }))}
                />
              </Form.Item>
              <Form.Item>
                <Button type="primary" loading={loading} onClick={onRecommend}>
                  推荐路径
                </Button>
              </Form.Item>
            </Form>
          </Card>

          {error && <Alert type="error" showIcon className="mb-3" message={error} />}

          <Spin spinning={loading}>
            {pathway && (
              <>
                <Card size="small" title="推荐路径结果" className="mb-3">
                  <Descriptions size="small" column={3}>
                    <Descriptions.Item label="路径名称" span={2}>
                      <Typography.Text strong>{pathway.name}</Typography.Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="编码">
                      <Tag color="blue">{pathway.pathwayCode}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="ICD-10">{pathway.icdCode}</Descriptions.Item>
                    <Descriptions.Item label="标准住院日">{pathway.standardLosDays} 天</Descriptions.Item>
                    <Descriptions.Item label="匹配置信度">{(pathway.confidence * 100).toFixed(0)}%</Descriptions.Item>
                  </Descriptions>
                  <div className="mt-2">
                    <Typography.Text type="secondary">推荐理由：</Typography.Text>
                    <ul className="!mb-0 !pl-5">
                      {pathway.rationale.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                  <Alert className="mt-2" type="warning" showIcon message={pathway.disclaimer} />
                </Card>

                <Row gutter={16} className="mb-3">
                  <Col xs={24} lg={16}>
                    <Card size="small" title="按天执行路径（医师确认后执行，可偏离）">
                      <Steps
                        direction="vertical"
                        current={-1}
                        items={pathway.steps.map((s, idx) => ({
                          title: `第${s.day}天 · ${s.name}`,
                          description: `${s.action}（步骤 ${idx + 1}）`,
                        }))}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} lg={8}>
                    <Card size="small" title="基准费用概算（医保参考，非收费）" className="mb-3">
                      <Statistic
                        title="概算总费用（元）"
                        value={pathway.estimatedCostCny}
                        precision={0}
                        valueStyle={{ color: '#0b3d91' }}
                      />
                      <Table
                        size="small"
                        className="mt-2"
                        rowKey="name"
                        pagination={false}
                        dataSource={pathway.costBreakdown}
                        columns={[
                          { title: '项目', dataIndex: 'name' },
                          { title: '金额(元)', dataIndex: 'amountCny', align: 'right' },
                        ]}
                      />
                    </Card>
                    {deviation && (
                      <Card
                        size="small"
                        title="路径偏离分析"
                      >
                        <Space direction="vertical" className="w-full">
                          <Tag color={deviation.isDeviated ? 'orange' : 'green'}>
                            {deviation.isDeviated ? `已偏离 ${(deviation.deviationRate * 100).toFixed(0)}%` : '暂未偏离'}
                          </Tag>
                          <Typography.Text type="secondary">{deviation.note}</Typography.Text>
                          {deviation.items.map((it, i) => (
                            <Typography.Text key={i}>
                              期望「{it.expected}」→ 实际「{it.actual}」（{it.deviationType}）
                            </Typography.Text>
                          ))}
                        </Space>
                      </Card>
                    )}
                  </Col>
                </Row>
              </>
            )}
          </Spin>
        </Content>
      </Layout>
    </Watermark>
  );
}
