/**
 * 健澜科技 jlmedaios - 出院小结质量评分 V13 页（M314-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Spin, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Dim {
  completeness: number;
  wordCount: number;
  icdCompleteness: number;
  medConsistency: number;
}

interface Resp {
  patientId: string;
  score: number;
  grade: string;
  dims: Dim;
  deficiencies: string[];
}

const gradeColor = (g: string): string =>
  g === "优" ? "green" : g === "良" ? "blue" : "red";

export default function DischargeSummaryQualityPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/discharge-summary-quality?patientId=p1");
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1024, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>出院小结质量评分</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card title={`综合分（患者 ${data.patientId}）`} style={{ marginBottom: 16 }}>
              <span style={{ fontSize: 48, color: VI.deep }}>{data.score}</span>
              <Tag color={gradeColor(data.grade)} style={{ marginLeft: 16, fontSize: 16 }}>
                {data.grade}
              </Tag>
            </Card>
            <Card title="四维分" style={{ marginBottom: 16 }}>
              <List
                dataSource={[
                  { name: "必填完整度", value: data.dims.completeness },
                  { name: "字数", value: data.dims.wordCount },
                  { name: "ICD编码完整度", value: data.dims.icdCompleteness },
                  { name: "用药一致性", value: data.dims.medConsistency },
                ]}
                renderItem={(it) => (
                  <List.Item>
                    <span>{it.name}</span>
                    <Tag color="blue">{it.value}</Tag>
                  </List.Item>
                )}
              />
            </Card>
            <Card title="缺陷维度（最低分）">
              <List
                dataSource={data.deficiencies}
                renderItem={(name) => (
                  <List.Item>
                    <Tag color="red">{name}</Tag>
                  </List.Item>
                )}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
