/**
 * 健澜科技 jlmedaios - 医学文献检索 V13 页（M327-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, List, Row, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface HotKeyword {
  keyword: string;
  count: number;
}

interface Resp {
  monthlySearches: number;
  exportCitations: number;
  hotKeywords: HotKeyword[];
}

export default function MedicalLiteraturePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/medical-literature");
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
        <Title level={3} style={{ color: VI.deep }}>医学文献检索</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Card>
                  <Statistic title="本月检索次数" value={data.monthlySearches} />
                </Card>
              </Col>
              <Col span={12}>
                <Card>
                  <Statistic title="导出引用数" value={data.exportCitations} />
                </Card>
              </Col>
            </Row>
            <Card title="热点词云 Top5">
              <List
                dataSource={data.hotKeywords}
                renderItem={(item, index) => (
                  <List.Item>
                    <Tag color={index < 3 ? "red" : "blue"} style={{ marginRight: 8 }}>
                      {index + 1}
                    </Tag>
                    {item.keyword}（{item.count} 次）
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
