/**
 * 健澜科技 jlmedaios - AI 大脑 V3 页（M232-A）
 *
 * 多模型路由/RAG检索增强/Agent编排/Prompt工程/AI治理/微调LoRA/API开放。深海蓝 VI。
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
  models: { available: number; routed: number };
  rag: { vectorDB: boolean; hybrid: boolean; rerank: boolean };
  agent: { planning: boolean; toolCall: boolean; multiStep: boolean; reflection: boolean };
  prompt: { templates: number };
  governance: { audited: boolean };
  finetune: { lora: boolean };
  api: { open: boolean };
  evaluation: { accuracy: number };
  suggestions: string[];
}

export default function AIBrainV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/ai-brain-v3/report");
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
        <Title level={3} style={{ color: VI.deep }}>AI 大脑 V3</Title>
        <Paragraph type="secondary">多模型路由 / RAG 向量库·混合检索·重排序 / Agent 编排·任务规划·工具调用·多步推理·反思 / Prompt 工程·AI 治理·LoRA 微调·API 开放</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="可用模型" value={data.models.available} /></Card></Col>
              <Col span={6}><Card><Statistic title="路由次数" value={data.models.routed} /></Card></Col>
              <Col span={6}><Card><Statistic title="Prompt 模板" value={data.prompt.templates} /></Card></Col>
              <Col span={6}><Card><Statistic title="准确率" value={`${data.evaluation.accuracy}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>AI 能力明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "rag", name: "RAG 向量库", value: data.rag.vectorDB ? "已部署" : "未部署" },
                  { key: "agent", name: "Agent 任务规划", value: data.agent.planning ? "已启用" : "未启用" },
                  { key: "lora", name: "LoRA 微调", value: data.finetune.lora ? "已支持" : "未支持" },
                  { key: "api", name: "API 开放", value: data.api.open ? "已开放" : "未开放" },
                ]}
                columns={[
                  { title: "项目", dataIndex: "name", key: "name" },
                  { title: "状态", dataIndex: "value", key: "value" },
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
