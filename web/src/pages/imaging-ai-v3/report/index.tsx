/**
 * 健澜科技 jlmedaios - 影像 AI V3 页（M238-B）
 *
 * 肺结节检测分类良恶性随访倍增时间/骨折/眼底糖网/病理癌细胞淋巴结转移/CT-MRI-超声多模态融合/AI报告置信度/模型漂移。深海蓝 VI。
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
  lung: { nodules: number; malignant: number; followup: number };
  fracture: number;
  fundus: number;
  pathology: { cancer: number; nodeMetastasis: number };
  multimodal: { ct: number; mri: number; us: number };
  drift: number;
  suggestions: string[];
}

export default function ImagingAIV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/imaging-ai-v3/report");
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
        <Title level={3} style={{ color: VI.deep }}>医学影像 AI V3</Title>
        <Paragraph type="secondary">肺结节检测·分类·良恶性·随访倍增时间 / 骨折·眼底糖网·病理癌细胞淋巴结转移 / CT-MRI-超声多模态融合 / AI 报告置信度·模型漂移</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="肺结节检出" value={data.lung.nodules} /></Card></Col>
              <Col span={6}><Card><Statistic title="骨折检测" value={data.fracture} /></Card></Col>
              <Col span={6}><Card><Statistic title="CT 量" value={data.multimodal.ct} /></Card></Col>
              <Col span={6}><Card><Statistic title="模型漂移" value={`${(data.drift * 100).toFixed(1)}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>影像 AI 明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "malignant", name: "恶性结节", value: data.lung.malignant },
                  { key: "fundus", name: "眼底糖网", value: data.fundus },
                  { key: "pathology", name: "病理癌细胞", value: data.pathology.cancer },
                  { key: "us", name: "超声", value: data.multimodal.us },
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
