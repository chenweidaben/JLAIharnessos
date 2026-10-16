/**
 * 健澜科技 jlmedaios - 临床科研智能化 V2 页（M233-B）
 *
 * RWS真实世界研究/AI语义病例检索/科研设计/统计分析/论文辅助写作/临床预测模型Nomogram/CRF自动填写。深海蓝 VI。
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
  rws: { studies: number; datasets: number };
  caseSearch: { semantic: number };
  studyDesign: { assisted: number };
  paperWriting: { drafts: number };
  nomogram: { models: number };
  crf: { autoFilled: number };
  suggestions: string[];
}

export default function ClinicalResearchAIV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/clinical-research-ai-v2/report");
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
        <Title level={3} style={{ color: VI.deep }}>临床科研智能化 V2</Title>
        <Paragraph type="secondary">RWS 真实世界研究 / AI 语义病例检索 / 科研设计·统计分析·论文辅助写作 / Nomogram 预测模型 / CRF 自动填写</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="RWS 研究" value={data.rws.studies} /></Card></Col>
              <Col span={6}><Card><Statistic title="语义病例检索" value={data.caseSearch.semantic} /></Card></Col>
              <Col span={6}><Card><Statistic title="论文草稿" value={data.paperWriting.drafts} /></Card></Col>
              <Col span={6}><Card><Statistic title="CRF 自动填写" value={data.crf.autoFilled} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>科研 AI 明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "dataset", name: "RWS 数据集", value: data.rws.datasets },
                  { key: "design", name: "科研设计辅助", value: data.studyDesign.assisted },
                  { key: "model", name: "Nomogram 模型", value: data.nomogram.models },
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
