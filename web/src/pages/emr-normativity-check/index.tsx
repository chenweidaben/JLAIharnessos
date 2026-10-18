/**
 * 健澜科技 jlmedaios - 病历规范性检查前端页（M476-D，M476 收官，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历正文输入框 + 不规范问题列表（红色标签）+ 修改建议。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Layout, List, Spin, Tag, Typography, Input, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

export default function EmrNormativityCheckPage() {
  const [content, setContent] = useState("患者大概于 3 天前出现发热，可能为上呼吸道感染。");
  const [loading, setLoading] = useState(false);
  const [issues, setIssues] = useState<string[]>([]);
  const [passed, setPassed] = useState<boolean | null>(null);

  const runCheck = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-normativity-check", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({ content }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setIssues(data?.result?.issues ?? []);
        setPassed(data?.result?.passed ?? null);
        message.success("规范性检查完成");
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
        <Title level={3} style={{ color: VI.deep }}>病历规范性检查</Title>
        <Card title="病历正文" headStyle={{ background: VI.mid, color: "#fff" }} style={{ marginBottom: 16 }}>
          <TextArea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            placeholder="请输入病历正文..."
          />
          <Button type="primary" onClick={runCheck} style={{ background: VI.accent, marginTop: 16 }}>
            开始检查
          </Button>
        </Card>
        <Spin spinning={loading}>
          <Card title="不规范问题列表" headStyle={{ background: VI.mid, color: "#fff" }} style={{ marginBottom: 16 }}>
            {issues.length === 0 ? (
              <Text type="secondary">无不规范问题</Text>
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
          {passed !== null && (
            <Card title="检查结论" headStyle={{ background: VI.mid, color: "#fff" }}>
              {passed ? (
                <Tag color="green">√ 规范性通过</Tag>
              ) : (
                <Tag color="red">✗ 存在不规范表述</Tag>
              )}
            </Card>
          )}
        </Spin>
      </Content>
    </Layout>
  );
}
