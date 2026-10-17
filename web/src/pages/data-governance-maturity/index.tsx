/**
 * 健澜科技 jlmedaios - 数据治理成熟度 V13 页（M323-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface DimensionResult {
  level: number;
  label: string;
}

interface Resp {
  masterData: DimensionResult;
  metadata: DimensionResult;
  dataQuality: DimensionResult;
  dataSecurity: DimensionResult;
}

const LEVEL_COLOR: Record<number, string> = {
  1: "default",
  2: "orange",
  3: "blue",
  4: "green",
};

export default function DataGovernanceMaturityPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/data-governance-maturity");
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
        <Title level={3} style={{ color: VI.deep }}>数据治理成熟度</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={6}>
              <Card>
                <Statistic title="主数据" value={data.masterData.level} />
                <Tag color={LEVEL_COLOR[data.masterData.level]} style={{ marginTop: 8 }}>
                  {data.masterData.label}
                </Tag>
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic title="元数据" value={data.metadata.level} />
                <Tag color={LEVEL_COLOR[data.metadata.level]} style={{ marginTop: 8 }}>
                  {data.metadata.label}
                </Tag>
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic title="数据质量" value={data.dataQuality.level} />
                <Tag color={LEVEL_COLOR[data.dataQuality.level]} style={{ marginTop: 8 }}>
                  {data.dataQuality.label}
                </Tag>
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic title="数据安全" value={data.dataSecurity.level} />
                <Tag color={LEVEL_COLOR[data.dataSecurity.level]} style={{ marginTop: 8 }}>
                  {data.dataSecurity.label}
                </Tag>
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
