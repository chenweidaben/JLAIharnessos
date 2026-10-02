/**
 * 健澜科技 jlmedaios - 科研队列详情组件（M5-B）
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { Button, Card, Descriptions, Empty, Statistic, Table, Tag } from 'antd';
import {
  CloudUploadOutlined,
  DownloadOutlined,
  InboxOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import { useResearchStore } from '@/store/researchStore';
import type { CohortMember } from '@/types/research';

export default function CohortDetail() {
  const {
    current,
    members,
    stats,
    running,
    runResult,
    exportRows,
    runMatching,
    publishCohort,
    archiveCohort,
    doExport,
  } = useResearchStore();

  if (!current) {
    return (
      <Card>
        <Empty description="从上方列表选择一个队列查看详情" />
      </Card>
    );
  }

  const memberColumns = [
    {
      title: '患者 MRN',
      key: 'mrn',
      render: (_: unknown, row: CohortMember) =>
        String(row.dataSnapshot.mrn ?? row.patientId),
    },
    {
      title: '性别',
      key: 'gender',
      render: (_: unknown, row: CohortMember) =>
        String(row.dataSnapshot.gender ?? '—'),
    },
    {
      title: '年龄',
      key: 'age',
      render: (_: unknown, row: CohortMember) =>
        row.dataSnapshot.age == null ? '—' : String(row.dataSnapshot.age),
    },
    {
      title: '命中规则',
      key: 'rules',
      render: (_: unknown, row: CohortMember) =>
        row.matchedRules.map((r) => <Tag key={r}>{r}</Tag>),
    },
  ];

  const inc = current.criteria.include;
  const exc = current.criteria.exclude;

  return (
    <div className="space-y-4">
      <Card
        title={`队列详情 · ${current.name}`}
        extra={
          <span className="flex gap-2">
            {current.status === 'draft' && (
              <Button
                type="primary"
                icon={<CloudUploadOutlined />}
                onClick={() => void publishCohort(current.id)}
              >
                发布
              </Button>
            )}
            {current.status === 'active' && (
              <Button
                icon={<PlayCircleOutlined />}
                loading={running}
                onClick={() => void runMatching(current.id)}
              >
                运行匹配
              </Button>
            )}
            {current.status !== 'archived' && (
              <Button
                icon={<InboxOutlined />}
                onClick={() => void archiveCohort(current.id)}
              >
                归档
              </Button>
            )}
            <Button icon={<DownloadOutlined />} onClick={() => void doExport(current.id)}>
              导出脱敏集
            </Button>
          </span>
        }
      >
        <Descriptions column={2} size="small">
          <Descriptions.Item label="目标疾病">{current.disease}</Descriptions.Item>
          <Descriptions.Item label="疾病编码">
            {current.diseaseCode ?? '—'}
          </Descriptions.Item>
          <Descriptions.Item label="年龄范围">
            {inc.minAge ?? '不限'} ~ {inc.maxAge ?? '不限'}
          </Descriptions.Item>
          <Descriptions.Item label="性别">{inc.gender ?? '不限'}</Descriptions.Item>
          <Descriptions.Item label="纳入诊断">
            {inc.diagnoses?.length ? inc.diagnoses.join('、') : '不限'}
          </Descriptions.Item>
          <Descriptions.Item label="纳入标签">
            {inc.tags?.length ? inc.tags.join('、') : '不限'}
          </Descriptions.Item>
          <Descriptions.Item label="排除诊断">
            {exc.diagnoses?.length ? exc.diagnoses.join('、') : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="排除标签">
            {exc.tags?.length ? exc.tags.join('、') : '—'}
          </Descriptions.Item>
        </Descriptions>
        {runResult && (
          <span className="mt-3 flex gap-6">
            <Statistic title="扫描患者" value={runResult.scanned} />
            <Statistic title="本次新增" value={runResult.added} />
            <Statistic title="队列总数" value={runResult.totalMembers} />
          </span>
        )}
      </Card>

      {stats && (
        <Card title="队列统计">
          <span className="flex gap-8">
            <Statistic title="成员总数" value={stats.total} />
            <div>
              <div className="mb-1 text-sm text-gray-500">性别分布</div>
              {Object.entries(stats.byGender).map(([g, n]) => (
                <Tag key={g} color="blue">
                  {g}: {n}
                </Tag>
              ))}
            </div>
            <div>
              <div className="mb-1 text-sm text-gray-500">年龄段</div>
              {Object.entries(stats.ageBuckets).map(([b, n]) => (
                <Tag key={b}>{b}: {n}</Tag>
              ))}
            </div>
          </span>
          {stats.topTags.length > 0 && (
            <div className="mt-3">
              <div className="mb-1 text-sm text-gray-500">高频标签</div>
              {stats.topTags.map((t) => (
                <Tag key={t.tag}>
                  {t.tag} × {t.count}
                </Tag>
              ))}
            </div>
          )}
        </Card>
      )}

      <Card title={`队列成员（${members.length}）`}>
        <Table<CohortMember>
          rowKey="id"
          size="middle"
          columns={memberColumns}
          dataSource={members}
          pagination={{ pageSize: 8 }}
        />
      </Card>

      {exportRows && (
        <Card title={`脱敏数据集（${exportRows.length} 行，可用于科研分析）`}>
          <pre className="max-h-72 overflow-auto rounded bg-gray-50 p-3 text-xs">
            {JSON.stringify(exportRows.slice(0, 20), null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
}
