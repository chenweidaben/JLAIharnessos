/**
 * 健澜科技 jlmedaios - 模型版本迭代记录 V13 页（M321-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, Spin, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface VersionItem {
  version: string;
  trainingSamples: number;
  releaseDate: string;
  hitRate: number;
}

interface Resp {
  versions: VersionItem[];
  latestVersion: VersionItem | null;
  improvementFromPrevious: number;
}

const columns: ColumnsType<VersionItem> = [
  { title: "版本号", dataIndex: "version", key: "version" },
  { title: "训练样本量", dataIndex: "trainingSamples", key: "trainingSamples" },
  { title: "上线时间", dataIndex: "releaseDate", key: "releaseDate" },
  { title: "命中率", dataIndex: "hitRate", key: "hitRate", render: (v: number) => `${v}%` },
];

export default function MuseModelVersionPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/muse-model-version");
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1024, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>模型版本迭代记录</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Card
            title={
              data.latestVersion ? (
                <span>
                  最新版本：{data.latestVersion.version}
                  <Tag color="green" style={{ marginLeft: 8 }}>
                    提升 +{data.improvementFromPrevious}pp
                  </Tag>
                </span>
              ) : (
                "版本列表"
              )
            }
          >
            <Table columns={columns} dataSource={data.versions} rowKey="version" pagination={false} />
          </Card>
        )}
      </Content>
    </Layout>
  );
}
