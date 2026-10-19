/**
 * 健澜科技 jlmedaios - 质控数据导出 Excel 前端页（M497-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：Excel 导出配置表单（标题/列选择）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Checkbox, Input, Layout, Table, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface ExportConfig {
  title: string;
  columns: string[];
}

interface FormattedRow {
  row: string[];
}

const availableColumns = ["科室", "缺陷数", "评分", "整改率", "闭环率"];

export default function EmrQcExportExcelPage() {
  const [config, setConfig] = useState<ExportConfig | null>(null);
  const [formattedRow, setFormattedRow] = useState<string[]>([]);
  const [title, setTitle] = useState("病历质控月报");
  const [selectedCols, setSelectedCols] = useState<string[]>(["科室", "缺陷数", "评分"]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-export-excel", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setConfig(data?.data?.config ?? null);
          setFormattedRow(data?.data?.formattedRow ?? []);
        }
      } catch {
        message.error("加载失败");
      }
    };
    void fetchData();
  }, []);

  // v5.0试点扩展：空值防护 columns 为 null 时不白屏
  const columns = (config?.columns ?? []).map((col, index) => ({
    title: col,
    dataIndex: `col${index}`,
    key: `col${index}`,
  }));

  const dataSource = formattedRow.length > 0
    ? [Object.fromEntries(formattedRow.map((val, i) => [`col${i}`, val]))]
    : [];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>质控数据导出 Excel</Title>
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title="导出配置">
          <Text style={{ marginRight: 8 }}>标题：</Text>
          <Input
            style={{ width: 300 }}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div style={{ marginTop: 16 }}>
            <Text>选择列：</Text>
            <Checkbox.Group
              style={{ marginLeft: 16 }}
              value={selectedCols}
              options={availableColumns}
              onChange={(vals) => setSelectedCols(vals as string[])}
            />
          </div>
          <Button type="primary" style={{ background: VI.accent, marginTop: 16 }}>
            生成 Excel
          </Button>
        </Card>
        {config && (
          <Card style={{ marginTop: 16 }} title="预览数据">
            <Table columns={columns} dataSource={dataSource} rowKey="0" pagination={false} size="small" />
          </Card>
        )}
      </Content>
    </Layout>
  );
}
