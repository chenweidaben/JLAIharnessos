/**
 * 健澜科技 jlmedaios - ICD 编码辅助与校对前端页（M464-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：编码建议列表（诊断词/ICD编码/名称）+ 手动校对确认按钮。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Input, Layout, List, message, Tag, Typography } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface IcdSuggestion {
  code: string;
  name: string;
}

export default function EmrIcdCodingPage() {
  const [text, setText] = useState("");
  const [suggestions, setSuggestions] = useState<IcdSuggestion[]>([]);

  const handleSuggest = async () => {
    if (!text.trim()) {
      message.warning("请输入病历文本");
      return;
    }
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-icd-coding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ noteId: "web-input", text }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setSuggestions(data?.suggestions ?? []);
      } else {
        message.warning("编码建议失败（后端 route 未就绪）");
      }
    } catch {
      message.warning("编码建议失败（后端 route 未就绪）");
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>ICD 编码辅助与校对</Title>
        <Card style={{ marginBottom: 16 }}>
          <Input.TextArea
            rows={4}
            placeholder="输入病历文本，如：患者因肺炎伴高血压入院"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <Button type="primary" style={{ marginTop: 8, background: VI.accent }} onClick={handleSuggest}>
            生成编码建议
          </Button>
        </Card>
        <Card title="编码建议列表" headStyle={{ background: VI.deep, color: "#fff" }}>
          <List
            dataSource={suggestions}
            renderItem={(item: IcdSuggestion) => (
              <List.Item
                actions={[<Button size="small" type="link">确认</Button>]}
              >
                <List.Item.Meta
                  title={<Tag color="blue">{item.code}</Tag>}
                  description={<Text>{item.name}</Text>}
                />
              </List.Item>
            )}
          />
        </Card>
      </Content>
    </Layout>
  );
}
