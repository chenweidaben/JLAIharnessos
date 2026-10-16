/**
 * 健澜科技 jlmedaios - 病历智能 V3 页（M238-C）
 *
 * NLP实体关系事件抽取/时间线否定词/自由文本→结构化/ICD自动编码/病历自动生成/质控丙级率/语音病历。深海蓝 VI。
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
  nlp: { entities: number; relations: number; events: number };
  structured: { freeText: number; icdAuto: number };
  auto: { noteGen: number; voice: number };
  qc: { gradeA: number; gradeB: number; gradeC: number };
  suggestions: string[];
}

export default function EMRIntelligentV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/emr-intelligent-v3/report");
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
        <Title level={3} style={{ color: VI.deep }}>病历智能化 V3</Title>
        <Paragraph type="secondary">NLP 实体·关系·事件抽取 / 自由文本→结构化 / ICD 自动编码 / 病历自动生成 / 质控丙级率 / 语音病历</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="NLP 实体" value={data.nlp.entities} /></Card></Col>
              <Col span={6}><Card><Statistic title="ICD 自动编码" value={data.structured.icdAuto} /></Card></Col>
              <Col span={6}><Card><Statistic title="病历自动生成" value={data.auto.noteGen} /></Card></Col>
              <Col span={6}><Card><Statistic title="甲级率 (%)" value={data.qc.gradeA} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>病历智能明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "relation", name: "关系抽取", value: data.nlp.relations },
                  { key: "event", name: "事件抽取", value: data.nlp.events },
                  { key: "voice", name: "语音病历", value: data.auto.voice },
                  { key: "gradeC", name: "丙级率 (%)", value: data.qc.gradeC },
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
