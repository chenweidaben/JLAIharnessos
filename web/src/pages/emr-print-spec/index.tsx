/**
 * 健澜科技 jlmedaios - 病历打印规范前端页（M478-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：打印规范配置表格（规范名/纸张/水印）+ 版式校验结果。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, Spin, Table, Tag, Typography } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface PrintSpecRow {
  spec: { name: string; paperSize: string; hasWatermark: boolean };
  validation: { valid: boolean; issues: string[] };
}

export default function EmrPrintSpecPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PrintSpecRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-print-spec", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled) setRows(data?.specs ?? []);
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
    { title: "规范名", dataIndex: ["spec", "name"], key: "name" },
    { title: "纸张", dataIndex: ["spec", "paperSize"], key: "paperSize" },
    {
      title: "水印",
      dataIndex: ["spec", "hasWatermark"],
      key: "hasWatermark",
      render: (hasWatermark: boolean) => (
        hasWatermark ? <Tag color="green">有</Tag> : <Tag color="red">无</Tag>
      ),
    },
    {
      title: "校验结果",
      dataIndex: "validation",
      key: "validation",
      render: (validation: { valid: boolean; issues: string[] }) => (
        validation.valid
          ? <Tag color="green">√ 合规</Tag>
          : <Tag color="red">✗ {validation.issues.join("；")}</Tag>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历打印规范</Title>
        <Card title="打印规范列表" headStyle={{ background: VI.mid, color: "#fff" }}>
          <Spin spinning={loading}>
            <Table dataSource={rows} columns={columns} rowKey={(r: PrintSpecRow) => r.spec.name} pagination={false} />
          </Spin>
          <Text type="secondary" style={{ marginTop: 16, display: "block" }}>
            合规条件：纸张 A4 + 含水印
          </Text>
        </Card>
      </Content>
    </Layout>
  );
}
