/**
 * 健澜科技 jlmedaios - 离任医生知识资产保留 V13 页（M297-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, List, Row, Spin, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Item {
  experienceId: string;
  title: string;
  dept: string;
  originalAuthor: string;
  content: string;
  scope: "public";
}

interface DeptGroup {
  dept: string;
  count: number;
  items: Item[];
}

export default function PublicKnowledgePage() {
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<DeptGroup[]>([]);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<DeptGroup[]>("/api/v1/public-knowledge");
        if (!cancelled) setGroups(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>院级公共知识库</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && (
          <Row gutter={[16, 16]}>
            {groups.map((g) => (
              <Col span={12} key={g.dept}>
                <Card title={`${g.dept}（${g.count} 条）`}>
                  <List
                    dataSource={g.items}
                    renderItem={(it) => (
                      <List.Item>
                        <List.Item.Meta
                          title={it.title}
                          description={it.content}
                        />
                        <Tag color="blue">原作者：{it.originalAuthor}</Tag>
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Content>
    </Layout>
  );
}
