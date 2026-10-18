/**
 * 健澜科技 jlmedaios - 病历质控通知公告前端页（M472-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：通知列表（类型徽章 公告蓝/警告橙/提醒绿）+ 发布表单。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Layout, List, Select, Spin, Tag, Typography } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Notice {
  id: string;
  title: string;
  content: string;
  type: "announcement" | "warning" | "reminder";
  date: string;
}

export default function EmrQcNoticePage() {
  const [loading, setLoading] = useState(true);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [typeFilter, setTypeFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const url = typeFilter
          ? `/api/v1/emr-qc-notice?type=${encodeURIComponent(typeFilter)}`
          : "/api/v1/emr-qc-notice";
        const resp = await fetch(url, {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled) setNotices(data?.notices ?? []);
        }
      } catch {
        // graceful
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [typeFilter]);

  const typeTag = (type: string) => {
    if (type === "announcement") return <Tag color="blue">公告</Tag>;
    if (type === "warning") return <Tag color="orange">警告</Tag>;
    return <Tag color="green">提醒</Tag>;
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历质控通知公告</Title>
        <Card style={{ marginBottom: 16 }}>
          <Select
            value={typeFilter || "all"}
            onChange={(v) => setTypeFilter(v === "all" ? "" : v)}
            style={{ width: 200 }}
            options={[
              { value: "all", label: "全部类型" },
              { value: "announcement", label: "公告" },
              { value: "warning", label: "警告" },
              { value: "reminder", label: "提醒" },
            ]}
          />
          <Button type="primary" style={{ marginLeft: 16, background: VI.accent }}>
            + 发布通知
          </Button>
        </Card>
        <Card title="通知列表" headStyle={{ background: VI.mid, color: "#fff" }}>
          <Spin spinning={loading}>
            <List
              dataSource={notices}
              renderItem={(item: Notice) => (
                <List.Item>
                  {typeTag(item.type)}
                  <Text strong style={{ marginLeft: 12 }}>{item.title}</Text>
                  <Text type="secondary" style={{ marginLeft: 12 }}>{item.content}</Text>
                  <Text type="secondary" style={{ marginLeft: 12 }}>{item.date}</Text>
                </List.Item>
              )}
            />
          </Spin>
        </Card>
      </Content>
    </Layout>
  );
}
