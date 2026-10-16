/**
 * 健澜科技 jlmedaios - 知识图谱 V4 页（M248-D）
 *
 * 疾病-症状-体征-检查-诊断-治疗-预后-并发症/药品-成分-适应证-禁忌-相互作用-不良反应/指南-推荐意见-证据等级/科室-医生-专长-患者-病种/因果关联规则路径图神经网络推理/智能问答检索推荐可视化。深海蓝 VI。
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
  entities: { disease: number; drug: number; test: number; guideline: number };
  relations: { symptom: number; indication: number; interaction: number };
  inference: { gnn: number; qna: number; retrieval: number };
  suggestions: string[];
}

export default function KnowledgeGraphV4Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/knowledge-graph-v4/report");
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
        <Title level={3} style={{ color: VI.deep }}>医院知识图谱 V4</Title>
        <Paragraph type="secondary">疾病·症状·体征·检查·诊断·治疗·预后·并发症 / 药品·成分·适应证·禁忌·相互作用·不良反应 / 指南·推荐意见·证据等级 / 科室·医生·专长·患者·病种 / 因果·关联·规则·路径·图神经网络推理 / 智能问答·检索·推荐·可视化</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="疾病实体" value={data.entities.disease} /></Card></Col>
              <Col span={6}><Card><Statistic title="症状关系" value={data.relations.symptom} /></Card></Col>
              <Col span={6}><Card><Statistic title="智能问答" value={data.inference.qna} /></Card></Col>
              <Col span={6}><Card><Statistic title="检索推荐" value={data.inference.retrieval} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>图谱明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "drug", name: "药品实体", value: data.entities.drug },
                  { key: "guideline", name: "指南", value: data.entities.guideline },
                  { key: "indication", name: "适应证关系", value: data.relations.indication },
                  { key: "gnn", name: "GNN 推理", value: data.inference.gnn },
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
