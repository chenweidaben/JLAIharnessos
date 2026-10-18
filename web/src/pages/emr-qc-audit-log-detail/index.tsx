/**
 * 健澜科技 jlmedaios - 质控操作日志查询明细前端页（M507-B，V14，EMR 深化四模块，-detail 避让）
 *
 * 深海蓝VI：操作日志查询（用户/操作/时间）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Input, Layout, List, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AuditLog {
  user: string;
  action: string;
  time: string;
}

export default function EmrQcAuditLogDetailPage() {
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<AuditLog[]>([]);
  const [searched, setSearched] = useState(false);

  const doSearch = async () => {
    try {
      const token = localStorage.getItem("token") ?? "";
      const url = keyword
        ? `/api/v1/emr-qc-audit-log-detail?keyword=${encodeURIComponent(keyword)}`
        : "/api/v1/emr-qc-audit-log-detail";
      const resp = await fetch(url, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      if (resp.ok) {
        const data = await resp.json();
        setResults(data?.data?.report?.results ?? []);
        setSearched(true);
      } else {
        message.error("查询失败");
      }
    } catch {
      message.error("网络错误");
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>操作日志查询</Title>
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="搜索日志">
          <Input.Search
            placeholder="输入关键词（用户或操作）"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onSearch={doSearch}
            enterButton={
              <Button type="primary" style={{ background: VI.accent }}>搜索</Button>
            }
            size="large"
            allowClear
          />
        </Card>
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title={searched ? `搜索结果（共 ${results.length} 条）` : "日志列表"}>
          <List
            dataSource={results}
            renderItem={(item) => (
              <List.Item>
                <Text strong style={{ width: 100, color: VI.deep }}>{item.user}</Text>
                <Tag color={VI.accent} style={{ width: 120 }}>{item.action}</Tag>
                <Text type="secondary">{item.time}</Text>
              </List.Item>
            )}
            locale={{ emptyText: searched ? "未找到匹配日志" : "请输入关键词搜索" }}
          />
        </Card>
      </Content>
    </Layout>
  );
}
