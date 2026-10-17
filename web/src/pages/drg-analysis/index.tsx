/**
 * 健澜科技 jlmedaios - 病种/DRG 经营分析 V5 页（M287-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, List, Row, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title, Paragraph } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface ProfitRow {
  drgCode: string;
  drgName: string;
  caseCnt: number;
  avgCost: number;
  avgReimburse: number;
  cmi: number;
  profit: { avgProfit: number; totalProfit: number; isLoss: boolean };
}

interface Result {
  list: ProfitRow[];
  ranking: { drgName: string; totalProfit: number; rank: number }[];
  lossDrgs: { drgName: string }[];
}

export default function DrgAnalysisPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/drg-analysis");
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>DRG 经营分析</Title>
        <Paragraph type="secondary">盈亏榜·CMI分布·亏损预警</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Row gutter={16}>
              <Col span={8}><Card><Statistic title="DRG 数" value={data.list.length} /></Card></Col>
              <Col span={8}><Card><Statistic title="亏损病种" value={data.lossDrgs.length} /></Card></Col>
              <Col span={8}><Card><Statistic title="盈利冠军" value={data.ranking[0]?.drgName ?? "—"} /></Card></Col>
            </Row>
            <Card title="DRG 盈亏" style={{ marginTop: 16 }}>
              <List
                dataSource={data.list}
                renderItem={(d) => (
                  <List.Item>
                    <List.Item.Meta
                      title={`${d.drgCode} ${d.drgName}`}
                      description={`例数=${d.caseCnt} 均次费用=${d.avgCost}万 赔付=${d.avgReimburse}万 CMI=${d.cmi}`}
                    />
                    <Tag color={d.profit.isLoss ? "red" : "green"}>
                      {d.profit.totalProfit.toFixed(1)}万
                    </Tag>
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
