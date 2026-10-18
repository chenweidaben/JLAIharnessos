/**
 * 健澜科技 jlmedaios - 病历质控专家库管理前端页（M474-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：专家卡片列表（姓名/科室徽章/职称）+ 科室筛选下拉。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Layout, Row, Select, Spin, Tag, Typography } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Expert {
  id: string;
  name: string;
  dept: string;
  title: string;
}

export default function EmrQcExpertPoolPage() {
  const [loading, setLoading] = useState(true);
  const [experts, setExperts] = useState<Expert[]>([]);
  const [dept, setDept] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const url = dept
          ? `/api/v1/emr-qc-expert-pool?dept=${encodeURIComponent(dept)}`
          : "/api/v1/emr-qc-expert-pool";
        const resp = await fetch(url, {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled) setExperts(data?.experts ?? []);
        }
      } catch {
        // graceful
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [dept]);

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历质控专家库管理</Title>
        <Card style={{ marginBottom: 16 }}>
          <Select
            value={dept || "all"}
            onChange={(v) => setDept(v === "all" ? "" : v)}
            style={{ width: 200, marginRight: 16 }}
            options={[
              { value: "all", label: "全部科室" },
              { value: "内科", label: "内科" },
              { value: "外科", label: "外科" },
            ]}
          />
          <Button type="primary" style={{ background: VI.accent }}>+ 新增专家</Button>
        </Card>
        <Spin spinning={loading}>
          <Row gutter={[16, 16]}>
            {experts.map((e) => (
              <Col span={8} key={e.id}>
                <Card>
                  <Title level={4} style={{ color: VI.deep, margin: 0 }}>{e.name}</Title>
                  <Tag color="blue" style={{ marginTop: 8 }}>{e.dept}</Tag>
                  <Text type="secondary" style={{ marginLeft: 8 }}>{e.title}</Text>
                </Card>
              </Col>
            ))}
          </Row>
        </Spin>
      </Content>
    </Layout>
  );
}
