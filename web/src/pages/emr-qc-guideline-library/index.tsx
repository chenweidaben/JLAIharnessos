/**
 * 健澜科技 jlmedaios - 质控指南库前端页（M505-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：指南库列表（指南名/专科/年份）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, Layout, List, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Guideline {
  title: string;
  specialty: string;
  year: number;
}

export default function EmrQcGuidelineLibraryPage() {
  const [guidelines, setGuidelines] = useState<Guideline[]>([]);
  const [specialty, setSpecialty] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const url = specialty
          ? `/api/v1/emr-qc-guideline-library?specialty=${encodeURIComponent(specialty)}`
          : "/api/v1/emr-qc-guideline-library";
        const resp = await fetch(url, {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setGuidelines(data?.data?.guidelines ?? []);
        }
      } catch {
        message.error("加载失败");
      }
    };
    void fetchData();
  }, [specialty]);

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>指南库</Title>
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="专科筛选">
          <Input.Search
            placeholder="输入专科（内科/外科/儿科）"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            enterButton={
              <Button type="primary" style={{ background: VI.accent }}>筛选</Button>
            }
            size="large"
            allowClear
          />
        </Card>
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title={`指南列表（共 ${guidelines.length} 条）`}>
          <List
            dataSource={guidelines}
            renderItem={(item) => (
              <List.Item>
                <Text strong style={{ width: 240, color: VI.deep }}>{item.title}</Text>
                <Tag color={VI.accent} style={{ width: 80 }}>{item.specialty}</Tag>
                <Tag color="blue">{item.year}</Tag>
              </List.Item>
            )}
            locale={{ emptyText: "暂无指南" }}
          />
        </Card>
      </Content>
    </Layout>
  );
}
