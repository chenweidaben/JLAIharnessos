/**
 * 健澜科技 jlmedaios - 病历一致性检查前端页（M476-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历段落输入（主诉/现病史/诊断）+ 冲突列表红色高亮。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Input, Layout, List, Spin, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

const initialSections = [
  { name: "主诉", content: "发热 3 天" },
  { name: "现病史", content: "体温正常，无咳嗽" },
  { name: "诊断", content: "上呼吸道感染" },
];

export default function EmrConsistencyCheckPage() {
  const [sections, setSections] = useState(initialSections);
  const [loading, setLoading] = useState(false);
  const [conflicts, setConflicts] = useState<string[]>([]);

  const updateContent = (name: string, value: string) => {
    setSections((prev) => prev.map((s) => (s.name === name ? { ...s, content: value } : s)));
  };

  const runCheck = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-consistency-check", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({ sections }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setConflicts(data?.result?.conflicts ?? []);
        message.success("一致性检查完成");
      }
    } catch {
      message.error("请求失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历一致性检查</Title>
        <Card title="病历段落" headStyle={{ background: VI.mid, color: "#fff" }} style={{ marginBottom: 16 }}>
          <Spin spinning={loading}>
            {sections.map((s) => (
              <div key={s.name} style={{ marginBottom: 12 }}>
                <Text strong style={{ marginRight: 8 }}>{s.name}：</Text>
                <Input
                  value={s.content}
                  onChange={(e) => updateContent(s.name, e.target.value)}
                  style={{ maxWidth: 500 }}
                />
              </div>
            ))}
            <Button type="primary" onClick={runCheck} style={{ background: VI.accent, marginTop: 8 }}>
              开始检查
            </Button>
          </Spin>
        </Card>
        <Card title="冲突列表" headStyle={{ background: VI.mid, color: "#fff" }}>
          {conflicts.length === 0 ? (
            <Text type="secondary">无冲突</Text>
          ) : (
            <List
              dataSource={conflicts}
              renderItem={(item: string) => (
                <List.Item>
                  <Tag color="red">{item}</Tag>
                </List.Item>
              )}
            />
          )}
        </Card>
      </Content>
    </Layout>
  );
}
