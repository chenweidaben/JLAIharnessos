/**
 * 健澜科技 jlmedaios - AI 大脑 3.0 V5 页（M257-C）
 *
 * GPT/Claude/通义/文心/自研模型路由AB测试模型选择/向量库知识库文档切片混合检索重排序引用溯源/任务规划工具调用多步推理反思自我修正多Agent协作/模板版本效果评估AB测试Prompt仓库最佳实践/输出审核幻觉检测偏见公平可解释人工复核责任归属/领域微调SFT/LoRA数据准备效果评估部署迭代/API/SDK/Webhook低代码AI市场能力计量/采纳率准确率满意度ROI持续学习模型漂移。深海蓝 VI。
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
  multiModel: { gpt: number; claude: number; qwen: number; ernie: number; self: number; route: number; abTest: number; select: number };
  rag: { vector: number; kb: number; chunk: number; hybridSearch: number; rerank: number; citation: number; trace: number };
  agent: { taskPlan: number; toolCall: number; multiStep: number; reflection: number; selfCorrect: number; multiAgent: number };
  prompt: { template: number; version: number; eval: number; abTest: number; repo: number; bestPractice: number };
  governance: { outputReview: number; hallucination: number; bias: number; explainability: number; manualReview: number; liability: number };
  finetune: { sft: number; lora: number; dataPrep: number; eval: number; deploy: number; iterate: number };
  open: { api: number; sdk: number; webhook: number; lowCode: number; market: number; metering: number };
  eval: { adoption: number; accuracy: number; satisfaction: number; roi: number; continuousLearning: number; drift: number };
  suggestions: string[];
}

export default function AIBrainV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/ai-brain-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>AI 大脑 3.0 V5</Title>
        <Paragraph type="secondary">GPT·Claude·通义·文心·自研·模型路由·AB 测试 / 向量库·知识库·切片·混合检索·重排序·引用溯源 / 任务规划·工具调用·多步推理·反思·自我修正·多 Agent / 模板·版本·评估·AB 测试·Prompt 仓库·最佳实践 / 输出审核·幻觉检测·偏见·可解释·人工复核·责任归属 / 领域微调·SFT·LoRA·数据准备·评估·部署迭代 / API·SDK·Webhook·低代码·AI 市场·能力计量 / 采纳率·准确率·满意度·ROI·持续学习·模型漂移</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="多模型" value={data.multiModel.gpt + data.multiModel.claude + data.multiModel.qwen} /></Card></Col>
              <Col span={6}><Card><Statistic title="幻觉率" value={`${data.governance.hallucination}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="准确率" value={`${data.eval.accuracy}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="ROI" value={`${data.eval.roi}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>AI 大脑明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "rag", name: "RAG 知识库", value: data.rag.kb },
                  { key: "agent", name: "Agent 工具调用", value: data.agent.toolCall },
                  { key: "finetune", name: "微调模型", value: data.finetune.sft + data.finetune.lora },
                  { key: "drift", name: "模型漂移", value: `${data.eval.drift}%` },
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
