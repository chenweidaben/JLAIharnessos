/**
 * 健澜科技 jlmedaios - 病历归档规则前端页（M478-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：归档规则表格（规则名/条件/保存年限）+ 资格检查结果。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Layout, Spin, Table, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface ArchiveRule {
  name: string;
  condition: string;
  retentionYears: number;
}

export default function EmrArchiveRulePage() {
  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState<ArchiveRule[]>([]);
  const [eligible, setEligible] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-archive-rule", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled) setRules(data?.rules ?? []);
        }
      } catch {
        // graceful
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const checkEligibility = () => {
    // 演示：出院 45 天 + 已审核 → 符合归档条件
    const isEligible = 45 >= 30 && true;
    setEligible(isEligible);
    message.success(isEligible ? "符合归档条件" : "不符合归档条件");
  };

  const columns = [
    { title: "规则名", dataIndex: "name", key: "name" },
    { title: "条件", dataIndex: "condition", key: "condition" },
    {
      title: "保存年限",
      dataIndex: "retentionYears",
      key: "retentionYears",
      render: (years: number) => <Text strong>{years} 年</Text>,
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历归档规则</Title>
        <Card title="归档规则列表" headStyle={{ background: VI.mid, color: "#fff" }} style={{ marginBottom: 16 }}>
          <Spin spinning={loading}>
            <Table dataSource={rules} columns={columns} rowKey="name" pagination={false} />
          </Spin>
        </Card>
        <Card title="归档资格检查" headStyle={{ background: VI.mid, color: "#fff" }}>
          <Button type="primary" onClick={checkEligibility} style={{ background: VI.accent, marginBottom: 16 }}>
            检查资格（演示数据：出院45天+已审核）
          </Button>
          {eligible !== null && (
            <div>
              {eligible ? (
                <Tag color="green" style={{ fontSize: 14, padding: 8 }}>√ 符合归档条件</Tag>
              ) : (
                <Tag color="red" style={{ fontSize: 14, padding: 8 }}>✗ 不符合归档条件</Tag>
              )}
            </div>
          )}
        </Card>
      </Content>
    </Layout>
  );
}
