/**
 * 健澜科技 jlmedaios - AI 辅助诊断 V3 页（M255-A）
 *
 * AI鉴别诊断症状→疾病概率排序相似病例鉴别树推荐/AI用药建议适应证禁忌相互作用剂量特殊人群耐药审核/AI病历生成主诉现病史既往史查体诊断治疗辅助书写/AI报告解读检验影像病理心电图摘要/AI采纳率建议采纳拒绝修改原因持续学习模型优化/AI诊断质量准确率灵敏度特异度AUC假阳假阴验证/AI临床路径路径推荐变异分析费用控制住院日覆盖率/AI诊断管理模型管理知识库指南库药品库可解释人工复核。深海蓝 VI。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import {
  Card,
  Col,
  Layout,
  List,
  Row,
  Spin,
  Statistic,
  Table,
  Typography,
} from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Result {
  timeRange: string;
  diagnosis: { visits: number; suggestions: number; topDisease: string; adoption: number };
  medication: { suggestions: number; interaction: number; contraindication: number; dose: number };
  note: { generated: number; corrected: number; accepted: number };
  interpretation: { lab: number; imaging: number; pathology: number; ecg: number };
  quality: { accuracy: number; sensitivity: number; specificity: number; auc: number };
  pathway: { recommended: number; variance: number; coverage: number; costControl: number };
  management: { model: number; kb: number; guideline: number; drug: number; explainable: boolean; manualReview: number };
  suggestions: string[];
}

export default function AIDiagnosisV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/ai-diagnosis-v3/report");
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>AI 辅助诊断 V3</Title>
        <Paragraph type="secondary">AI 鉴别诊断·症状→疾病概率·相似病例·鉴别树 / AI 用药建议·适应证·禁忌·相互作用·剂量 / AI 病历生成·主诉·现病史·既往史·查体 / AI 报告解读·检验·影像·病理·心电图 / AI 采纳率·建议采纳·拒绝·修改原因 / AI 诊断质量·准确率·灵敏度·特异度·AUC / AI 临床路径·路径推荐·变异·费用控制 / AI 管理·模型·知识库·指南库·可解释</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="AI 建议数" value={data.diagnosis.suggestions} /></Card></Col>
              <Col span={6}><Card><Statistic title="采纳率" value={`${data.diagnosis.adoption}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="准确率" value={`${data.quality.accuracy}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="AUC" value={data.quality.auc} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>AI 诊断明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "interaction", name: "相互作用拦截", value: data.medication.interaction },
                  { key: "noteGenerated", name: "AI 生成病历", value: data.note.generated },
                  { key: "pathwayCoverage", name: "路径覆盖", value: `${data.pathway.coverage}%` },
                  { key: "manualReview", name: "人工复核", value: data.management.manualReview },
                ]}
                columns={[
                  { title: "项目", dataIndex: "name", key: "name" },
                  { title: "数值", dataIndex: "value", key: "value" },
                ]}
              />
            </Card>

            <Card title={<Text strong style={{ color: VI.deep }}>改进建议</Text>}>
              <List
                size="small"
                dataSource={data.suggestions}
                renderItem={(s) => <List.Item><Text>{s}</Text></List.Item>}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
