/**
 * 健澜科技 jlmedaios - 单病种成本 V13 页（M329-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, List, Row, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface DiseaseCostItem {
  diseaseName: string;
  totalCost: number;
}

interface Resp {
  top5: DiseaseCostItem[];
  drugRatio: number;
  consumableRatio: number;
}

export default function CostPerPatientPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/cost-per-patient");
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
        <Title level={3} style={{ color: VI.deep }}>单病种成本</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Card>
                  <Statistic title="药占比（参考病种）" value={data.drugRatio} suffix="%" />
                </Card>
              </Col>
              <Col span={12}>
                <Card>
                  <Statistic title="耗占比（参考病种）" value={data.consumableRatio} suffix="%" />
                </Card>
              </Col>
            </Row>
            <Card title="Top5 病种例均费用">
              <List
                dataSource={data.top5}
                renderItem={(item, index) => (
                  <List.Item>
                    <Tag color={index < 3 ? "red" : "blue"} style={{ marginRight: 8 }}>
                      {index + 1}
                    </Tag>
                    {item.diseaseName}（¥{item.totalCost}）
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
