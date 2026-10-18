/**
 * 健澜科技 jlmedaios - 病历模板质控联动前端页（M477-D，M477 收官，V14，EMR 深化四模块）
 *
 * 深海蓝VI：模板列表表格（模板名/关联规则数/规则标签）+ 点击展开规则详情。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, Spin, Table, Tag, Typography } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface TemplateQcLink {
  templateId: string;
  templateName: string;
  rules: string[];
}

export default function EmrTemplateQcLinkPage() {
  const [loading, setLoading] = useState(true);
  const [links, setLinks] = useState<TemplateQcLink[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-template-qc-link", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled) setLinks(data?.links ?? []);
        }
      } catch {
        // graceful
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const columns = [
    { title: "模板 ID", dataIndex: "templateId", key: "templateId" },
    { title: "模板名", dataIndex: "templateName", key: "templateName" },
    {
      title: "关联规则数",
      dataIndex: "rules",
      key: "ruleCount",
      render: (rules: string[]) => <Text strong>{rules.length}</Text>,
    },
    {
      title: "规则标签",
      dataIndex: "rules",
      key: "ruleTags",
      render: (rules: string[]) => (
        <>
          {rules.map((r) => (
            <Tag key={r} color="blue" style={{ marginBottom: 4 }}>{r}</Tag>
          ))}
        </>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历模板质控联动</Title>
        <Card title="模板-质控规则关联列表" headStyle={{ background: VI.mid, color: "#fff" }}>
          <Spin spinning={loading}>
            <Table dataSource={links} columns={columns} rowKey="templateId" pagination={false} />
          </Spin>
        </Card>
      </Content>
    </Layout>
  );
}
