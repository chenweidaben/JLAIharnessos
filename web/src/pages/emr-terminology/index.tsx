/**
 * 健澜科技 jlmedaios - 病历术语规范前端页（M477-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历文本输入框 + 不规范术语列表（红色）+ 标准化建议（绿色）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Layout, List, Spin, Tag, Typography, Input, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

export default function EmrTerminologyPage() {
  const [text, setText] = useState("患者拉肚子 3 天，发烧 38.5℃，头疼明显。");
  const [loading, setLoading] = useState(false);
  const [issues, setIssues] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const runCheck = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-terminology", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({ text }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setIssues(data?.result?.issues ?? []);
        setSuggestions(data?.result?.suggestions ?? []);
        message.success("术语规范检查完成");
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
        <Title level={3} style={{ color: VI.deep }}>病历术语规范</Title>
        <Card title="病历文本" headStyle={{ background: VI.mid, color: "#fff" }} style={{ marginBottom: 16 }}>
          <TextArea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder="请输入病历文本..."
          />
          <Button type="primary" onClick={runCheck} style={{ background: VI.accent, marginTop: 16 }}>
            开始检查
          </Button>
        </Card>
        <Spin spinning={loading}>
          <Card title="不规范术语列表" headStyle={{ background: VI.mid, color: "#fff" }} style={{ marginBottom: 16 }}>
            {issues.length === 0 ? (
              <Text type="secondary">无不规范术语</Text>
            ) : (
              <List
                dataSource={issues}
                renderItem={(item: string) => (
                  <List.Item>
                    <Tag color="red">{item}</Tag>
                  </List.Item>
                )}
              />
            )}
          </Card>
          <Card title="标准化建议" headStyle={{ background: VI.mid, color: "#fff" }}>
            {suggestions.length === 0 ? (
              <Text type="secondary">无建议</Text>
            ) : (
              <List
                dataSource={suggestions}
                renderItem={(item: string) => (
                  <List.Item>
                    <Tag color="green">{item}</Tag>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Spin>
      </Content>
    </Layout>
  );
}
