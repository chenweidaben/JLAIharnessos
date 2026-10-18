/**
 * 健澜科技 jlmedaios - 病历 AI 辅助书写实时建议前端页（M467-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：左侧病历输入区+右侧建议侧边栏（按优先级高亮）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Col, Input, Layout, List, message, Row, Tag, Typography } from "antd";

const { Content } = Layout;
const { Title } = Typography;
const { TextArea } = Input;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Suggestion {
  id: string;
  text: string;
  priority: number;
}

export default function EmrAiAssistantPage() {
  const [context, setContext] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const handleGenerate = async () => {
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-assistant/suggest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ context }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setSuggestions(data?.suggestions ?? []);
        message.success("建议生成完成");
      } else {
        message.warning("生成失败（后端 route 未就绪）");
      }
    } catch {
      message.warning("生成失败（后端 route 未就绪）");
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历 AI 辅助书写</Title>
        <Row gutter={16}>
          <Col span={12}>
            <Card title="病历上下文输入" headStyle={{ background: VI.deep, color: "#fff" }}>
              <TextArea
                rows={8}
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="输入病历内容，如：患者咳嗽3天，发热..."
              />
              <Button type="primary" style={{ marginTop: 12, background: VI.accent }} onClick={handleGenerate}>生成建议</Button>
            </Card>
          </Col>
          <Col span={12}>
            <Card title="实时建议（按优先级）" headStyle={{ background: VI.mid, color: "#fff" }}>
              <List
                dataSource={suggestions}
                renderItem={(item: Suggestion) => (
                  <List.Item>
                    <Tag color={item.priority >= 5 ? "red" : item.priority >= 3 ? "orange" : "default"}>
                      P{item.priority}
                    </Tag>
                    <span>{item.text}</span>
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
}
