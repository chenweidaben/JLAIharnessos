/**
 * 健澜科技 jlmedaios - 互联互通四甲自评 V13 页（M323-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Resp {
  platformStandardScore: number;
  infoSharingScore: number;
  businessCollabScore: number;
  overallScore: number;
  isQualified: boolean;
}

export default function Intercon4LevelPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/intercon4-level");
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
        <Title level={3} style={{ color: VI.deep }}>互联互通四甲自评</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card style={{ marginBottom: 16 }}>
              <Statistic title="总分" value={data.overallScore} style={{ marginRight: 48 }} />
              {data.isQualified ? (
                <Tag color="green" style={{ fontSize: 14, padding: "4px 12px" }}>达标（四甲）</Tag>
              ) : (
                <Tag color="red" style={{ fontSize: 14, padding: "4px 12px" }}>未达标</Tag>
              )}
            </Card>
            <Row gutter={16}>
              <Col span={8}>
                <Card>
                  <Statistic title="平台标准化" value={data.platformStandardScore} />
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic title="信息共享" value={data.infoSharingScore} />
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic title="业务协同" value={data.businessCollabScore} />
                </Card>
              </Col>
            </Row>
          </>
        )}
      </Content>
    </Layout>
  );
}
