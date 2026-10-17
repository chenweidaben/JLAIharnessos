/**
 * 健澜科技 jlmedaios - 个人知识图谱与继任者交接 V10 页（M292-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, List, Row, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title, Paragraph } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface GraphRow {
  doctorId: string;
  dept: string;
  specialtyCount: number;
  successCount: number;
  failureCount: number;
  practiceCount: number;
  knowledgeDensity: number;
}

export default function KnowledgePage() {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<GraphRow[]>([]);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<GraphRow[]>("/api/v1/knowledge/handover-priority");
        if (!cancelled) setList(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>个人知识图谱与交接</Title>
        <Paragraph type="secondary">专长·成功·失败·实践四维</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && (
          <Card title="交接优先级（知识密度降序）">
            <List
              dataSource={list}
              renderItem={(g) => (
                <List.Item>
                  <List.Item.Meta
                    title={`${g.doctorId}（${g.dept}）`}
                    description={`专长=${g.specialtyCount} 成功=${g.successCount} 失败=${g.failureCount} 实践=${g.practiceCount}`}
                  />
                  <Row gutter={8}>
                    <Col span={12}>
                      <Statistic title="知识密度" value={g.knowledgeDensity} />
                    </Col>
                    <Col span={12}>
                      <Tag color={g.knowledgeDensity >= 50 ? "red" : "blue"}>优先交接</Tag>
                    </Col>
                  </Row>
                </List.Item>
              )}
            />
          </Card>
        )}
      </Content>
    </Layout>
  );
}
