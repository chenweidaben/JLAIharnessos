/**
 * 健澜科技 jlmedaios - 员工满意度总览 V13 页（M332-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, List, Row, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface DepartmentRank {
  department: string;
  score: number;
}

interface Resp {
  overallScore: number;
  departmentRanking: DepartmentRank[];
}

export default function StaffSatisfactionOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/staff-satisfaction-overview");
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
        <Title level={3} style={{ color: VI.deep }}>员工满意度总览</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={24}>
                <Card>
                  <Statistic title="全院均分" value={data.overallScore} suffix="/ 5" />
                </Card>
              </Col>
            </Row>
            <Card title="各科室排名（按均分降序）">
              <List
                dataSource={data.departmentRanking}
                renderItem={(item, index) => (
                  <List.Item>
                    第 {index + 1} 名：{item.department}
                    <Tag color={index === 0 ? "green" : "default"} style={{ marginLeft: 8 }}>
                      {item.score} 分
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
