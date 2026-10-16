/**
 * 健澜科技 jlmedaios - 影像 AI V4 页（M248-B）
 *
 * 肺结节LDCT良恶性随访体积倍增/骨折脱位隐匿儿童/眼底糖网青光眼黄斑/病理癌细胞淋巴结IHC/TIL/多模态CT-MRI-超声影像基因组/结构化报告置信度/模型监控漂移联邦学习。深海蓝 VI。
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
  lung: { nodules: number; ldct: number; followup: number };
  ortho: { fracture: number; dislocation: number; pediatric: number };
  fundus: { retinopathy: number; glaucoma: number; macular: number };
  pathology: { cancer: number; ihc: number; til: number };
  suggestions: string[];
}

export default function ImagingAIV4Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/imaging-ai-v4/report");
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
        <Title level={3} style={{ color: VI.deep }}>医学影像 AI V4</Title>
        <Paragraph type="secondary">肺结节·LDCT·良恶性·随访·体积倍增 / 骨折·脱位·隐匿·儿童 / 眼底·糖网·青光眼·黄斑 / 病理·癌细胞·淋巴结·IHC·TIL / 多模态·CT·MRI·超声·影像基因组 / 结构化报告·置信度 / 模型监控·漂移·联邦学习</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="肺结节" value={data.lung.nodules} /></Card></Col>
              <Col span={6}><Card><Statistic title="LDCT" value={data.lung.ldct} /></Card></Col>
              <Col span={6}><Card><Statistic title="骨折" value={data.ortho.fracture} /></Card></Col>
              <Col span={6}><Card><Statistic title="糖网" value={data.fundus.retinopathy} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>影像明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "followup", name: "随访率", value: `${data.lung.followup}%` },
                  { key: "pediatric", name: "儿童隐匿骨折", value: data.ortho.pediatric },
                  { key: "cancer", name: "病理癌症", value: data.pathology.cancer },
                  { key: "ihc", name: "IHC", value: data.pathology.ihc },
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
