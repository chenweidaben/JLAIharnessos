/**
 * 健澜科技 jlmedaios - 数据中台智能化 V2 页（M235-C）
 *
 * 数据集成/开发/治理/服务/AI中台/MLOps/模型市场/特征工程/智能问答/数据洞察/异常检测/资产血缘。深海蓝 VI。
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
  lakehouse: { integration: number; development: number; governance: number; service: number };
  ai: { mlops: number; modelMarket: number; feature: number };
  qna: { nl2sql: number; insight: number; anomaly: number };
  lineage: { assets: number };
  suggestions: string[];
}

export default function DataPlatformAIV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/data-platform-ai-v2/report");
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
        <Title level={3} style={{ color: VI.deep }}>数据中台智能化 V2</Title>
        <Paragraph type="secondary">数据湖仓·集成·开发·治理·服务 / AI 中台·MLOps·模型市场·特征工程 / 智能问答·数据洞察·异常检测 / 资产血缘</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="数据集成" value={data.lakehouse.integration} /></Card></Col>
              <Col span={6}><Card><Statistic title="NL2SQL" value={data.qna.nl2sql} /></Card></Col>
              <Col span={6}><Card><Statistic title="MLOps" value={data.ai.mlops} /></Card></Col>
              <Col span={6}><Card><Statistic title="数据资产" value={data.lineage.assets} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>数据中台明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "dev", name: "数据开发", value: data.lakehouse.development },
                  { key: "gov", name: "数据治理", value: data.lakehouse.governance },
                  { key: "feature", name: "特征工程", value: data.ai.feature },
                  { key: "anomaly", name: "异常检测", value: data.qna.anomaly },
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
