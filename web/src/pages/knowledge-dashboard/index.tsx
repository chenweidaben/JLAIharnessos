/**
 * 健澜科技 jlmedaios - 医院级 AI 知识资产大盘 V10 页（M292-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title, Paragraph } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Asset {
  failureTotal: number;
  practiceTotal: number;
  doctorCount: number;
  avgDensity: number;
}

interface Growth {
  failureDropRatePct: number;
  practiceGrowthRatePct: number;
  densityGrowthRatePct: number;
}

interface Gap {
  gapRootCause: string;
  gapCount: number;
  light: "red" | "yellow" | "green";
}

export default function KnowledgeDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [asset, setAsset] = useState<Asset | null>(null);
  const [growth, setGrowth] = useState<Growth | null>(null);
  const [gap, setGap] = useState<Gap | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [a, g, p] = await Promise.all([
          get<Asset>("/api/v1/knowledge/asset-dashboard"),
          get<Growth>("/api/v1/knowledge/growth?period=week"),
          get<Gap>("/api/v1/knowledge/gap"),
        ]);
        if (!cancelled) {
          setAsset(a);
          setGrowth(g);
          setGap(p);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>院长 AI 知识资产大盘</Title>
        <Paragraph type="secondary">失败教训·最佳实践·医生图谱·周环比</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && asset && growth && gap && (
          <>
            <Row gutter={16}>
              <Col span={6}><Card><Statistic title="失败教训总数" value={asset.failureTotal} /></Card></Col>
              <Col span={6}><Card><Statistic title="最佳实践数" value={asset.practiceTotal} /></Card></Col>
              <Col span={6}><Card><Statistic title="有图谱医生" value={asset.doctorCount} /></Card></Col>
              <Col span={6}><Card><Statistic title="平均知识密度" value={asset.avgDensity} /></Card></Col>
            </Row>
            <Row gutter={16} style={{ marginTop: 16 }}>
              <Col span={8}><Card><Statistic title="失败下降率" value={`${growth.failureDropRatePct}%`} /></Card></Col>
              <Col span={8}><Card><Statistic title="实践增长率" value={`${growth.practiceGrowthRatePct}%`} /></Card></Col>
              <Col span={8}><Card><Statistic title="图谱完善率" value={`${growth.densityGrowthRatePct}%`} /></Card></Col>
            </Row>
            <Card title="知识缺口" style={{ marginTop: 16 }}>
              <Tag color={gap.light === "red" ? "red" : gap.light === "yellow" ? "orange" : "green"}>
                {gap.gapRootCause}（{gap.gapCount}例）
              </Tag>
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
