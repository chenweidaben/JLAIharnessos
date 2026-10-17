/**
 * 健澜科技 jlmedaios - NURSE_MUSE 主动式交接班简报 V11 页（M293-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, List, Row, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title, Paragraph } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface ShiftItem {
  id: string;
  category: string;
  title: string;
  priority: number;
}

interface ShiftResult {
  nurseId: string;
  items: ShiftItem[];
  bedCount: number;
  ivCount: number;
  pressureHighCount: number;
  nightEventCount: number;
  handoverCount: number;
  text: string;
}

export default function ShiftBriefPage() {
  const [loading, setLoading] = useState(true);
  const [brief, setBrief] = useState<ShiftResult | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<ShiftResult>("/api/v1/shift-brief?nurseId=n-001");
        if (!cancelled) setBrief(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>NURSE_MUSE 交接班</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && brief && (
          <>
            <Card bordered={false} style={{ background: VI.deep, color: "#fff", marginBottom: 16 }}>
              <Paragraph style={{ color: "#fff", fontSize: 16 }}>{brief.text}</Paragraph>
            </Card>
            <Row gutter={16}>
              <Col span={5}><Card><Statistic title="分管床位" value={brief.bedCount} /></Card></Col>
              <Col span={5}><Card><Statistic title="夜间异常" value={brief.nightEventCount} /></Card></Col>
              <Col span={5}><Card><Statistic title="压疮高危" value={brief.pressureHighCount} /></Card></Col>
              <Col span={5}><Card><Statistic title="输液" value={brief.ivCount} /></Card></Col>
              <Col span={4}><Card><Statistic title="待交接" value={brief.handoverCount} /></Card></Col>
            </Row>
            <Card title="交接清单（按优先级）" style={{ marginTop: 16 }}>
              <List
                dataSource={brief.items}
                renderItem={(it) => (
                  <List.Item>
                    <List.Item.Meta title={it.title} description={`分类=${it.category}`} />
                    <Tag color={it.category === "nightEvent" ? "red" : it.category === "pressureRisk" ? "orange" : "blue"}>
                      P{it.priority}
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
