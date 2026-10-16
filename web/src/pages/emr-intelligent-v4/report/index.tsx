/**
 * 健澜科技 jlmedaios - 病历智能 V4 页（M248-C）
 *
 * NLP实体关系时间线否定怀疑/自由文本→结构化ICD自动编码/主诉现病史既往史查体诊断出院小结自动生成/完整一致逻辑内涵复制率丙级率AI质控/隐私脱敏电子签名审计水印/语音录入医学术语方言/模板推荐补全纠错摘要。深海蓝 VI。
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
  nlp: { entities: number; timeline: number; negation: number };
  generation: { autoSummary: number; voiceInput: number; template: number };
  quality: { completeness: number; copyRate: number; cGrade: number };
  security: { desensitized: number; eSignature: number; watermark: number };
  suggestions: string[];
}

export default function EMRIntelligentV4Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/emr-intelligent-v4/report");
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
        <Title level={3} style={{ color: VI.deep }}>病历智能化 V4</Title>
        <Paragraph type="secondary">NLP·实体·关系·时间线·否定怀疑 / 自由文本→结构化·ICD 自动编码 / 主诉·现病史·既往史·查体·诊断·出院小结·自动生成 / 完整·一致·逻辑内涵·复制率·丙级率·AI 质控 / 隐私脱敏·电子签名·审计水印 / 语音录入·医学术语·方言 / 模板推荐·补全·纠错·摘要</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="NLP 实体" value={data.nlp.entities} /></Card></Col>
              <Col span={6}><Card><Statistic title="语音录入" value={data.generation.voiceInput} /></Card></Col>
              <Col span={6}><Card><Statistic title="完整率" value={`${data.quality.completeness}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="电子签名" value={data.security.eSignature} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>病历明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "timeline", name: "时间线", value: data.nlp.timeline },
                  { key: "autoSummary", name: "自动摘要", value: data.generation.autoSummary },
                  { key: "copyRate", name: "复制率", value: `${data.quality.copyRate}%` },
                  { key: "desensitized", name: "脱敏率", value: `${data.security.desensitized}%` },
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
