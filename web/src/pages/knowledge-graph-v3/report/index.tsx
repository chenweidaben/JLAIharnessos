/**
 * 健澜科技 jlmedaios - 知识图谱 V3 页（M238-D）
 *
 * 疾病-症状-检查-诊断-治疗-预后/药品-成分-适应证-禁忌-相互作用/指南推荐意见证据等级/知识推理因果路径。深海蓝 VI。
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
  disease: { nodes: number; relations: number };
  drug: { nodes: number; interactions: number };
  guideline: { recommendations: number; evidenceLevel: number };
  inference: { queries: number; paths: number };
  suggestions: string[];
}

export default function KnowledgeGraphV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/knowledge-graph-v3/report");
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
        <Title level={3} style={{ color: VI.deep }}>医院知识图谱 V3</Title>
        <Paragraph type="secondary">疾病-症状-检查-诊断-治疗-预后 / 药品-成分-适应证-禁忌-相互作用 / 指南推荐意见·证据等级 / 知识推理·因果路径</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="疾病节点" value={data.disease.nodes} /></Card></Col>
              <Col span={6}><Card><Statistic title="药品节点" value={data.drug.nodes} /></Card></Col>
              <Col span={6}><Card><Statistic title="指南推荐" value={data.guideline.recommendations} /></Card></Col>
              <Col span={6}><Card><Statistic title="推理查询" value={data.inference.queries} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>知识图谱明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "relation", name: "疾病关系", value: data.disease.relations },
                  { key: "interaction", name: "药品相互作用", value: data.drug.interactions },
                  { key: "evidence", name: "证据等级", value: data.guideline.evidenceLevel },
                  { key: "path", name: "因果路径", value: data.inference.paths },
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
