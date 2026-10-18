/**
 * 健澜科技 jlmedaios - 病历内涵质控前端页（M477-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历正文输入框 + 内涵评分大数字（绿≥80/蓝≥60/红<60）+ 命中关键词列表。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Layout, List, Spin, Tag, Typography, Input, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

export default function EmrIntrinsicQcPage() {
  const [content, setContent] = useState("患者主诉发热 3 天，现病史记录体温变化，诊断为上呼吸道感染，给予对症治疗，预后良好。");
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [hitKeywords, setHitKeywords] = useState<string[]>([]);

  const runCheck = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-intrinsic-qc", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({ content }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setScore(data?.result?.score ?? null);
        setHitKeywords(data?.result?.hitKeywords ?? []);
        message.success("内涵质控完成");
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
        <Title level={3} style={{ color: VI.deep }}>病历内涵质控</Title>
        <Card title="病历正文" headStyle={{ background: VI.mid, color: "#fff" }} style={{ marginBottom: 16 }}>
          <TextArea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            placeholder="请输入病历正文..."
          />
          <Button type="primary" onClick={runCheck} style={{ background: VI.accent, marginTop: 16 }}>
            开始分析
          </Button>
        </Card>
        <Spin spinning={loading}>
          {score !== null && (
            <Card title="内涵评分" headStyle={{ background: VI.mid, color: "#fff" }} style={{ marginBottom: 16 }}>
              <Title level={1} style={{ color: score >= 80 ? "#52c41a" : score >= 60 ? VI.accent : "#f5222d", margin: 0 }}>
                {score} 分
              </Title>
            </Card>
          )}
          <Card title="命中关键词" headStyle={{ background: VI.mid, color: "#fff" }}>
            {hitKeywords.length === 0 ? (
              <Text type="secondary">无命中关键词</Text>
            ) : (
              <List
                dataSource={hitKeywords}
                renderItem={(item: string) => (
                  <List.Item>
                    <Tag color="blue">{item}</Tag>
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
