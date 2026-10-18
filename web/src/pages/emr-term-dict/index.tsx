/**
 * 健澜科技 jlmedaios - 病历术语标准词库前端页（M464-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：词库浏览表（标准词/同义词）+ 纠错建议输入框。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, Layout, List, message, Spin, Tag, Typography } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Correction {
  input: string;
  standard: string;
}

export default function EmrTermDictPage() {
  const [loading, setLoading] = useState(true);
  const [dict, setDict] = useState<Record<string, string[]>>({});
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<Correction[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-term-dict", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled) setDict(data?.dict ?? {});
        }
      } catch {
        // graceful
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSuggest = async () => {
    if (!input.trim()) {
      message.warning("请输入文本");
      return;
    }
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-term-dict/suggest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ text: input }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setSuggestions(data?.suggestions ?? []);
      } else {
        message.warning("纠错建议失败（后端 route 未就绪）");
      }
    } catch {
      message.warning("纠错建议失败（后端 route 未就绪）");
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历术语标准词库</Title>
        <Card style={{ marginBottom: 16 }}>
          <Input.TextArea
            rows={2}
            placeholder="输入不规范术语，如：患者血压高伴DM"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <Button type="primary" style={{ marginTop: 8, background: VI.accent }} onClick={handleSuggest}>
            纠错建议
          </Button>
          {suggestions.length > 0 && (
            <List
              size="small"
              style={{ marginTop: 12 }}
              dataSource={suggestions}
              renderItem={(item: Correction) => (
                <List.Item>
                  <Tag color="orange">{item.input}</Tag>
                  <Text>→</Text>
                  <Tag color="green">{item.standard}</Tag>
                </List.Item>
              )}
            />
          )}
        </Card>
        <Card title="词库浏览" headStyle={{ background: VI.deep, color: "#fff" }}>
          <Spin spinning={loading}>
            <List
              size="small"
              dataSource={Object.entries(dict)}
              renderItem={([standard, synonyms]: [string, string[]]) => (
                <List.Item>
                  <Tag color="blue">{standard}</Tag>
                  <Text type="secondary">同义词：{synonyms.join("、")}</Text>
                </List.Item>
              )}
            />
          </Spin>
        </Card>
      </Content>
    </Layout>
  );
}
