/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 诊断辅助面板：ICD-10 搜索、鉴别诊断、CDS 提醒、历史诊断、常见诊断快捷。
 */
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Empty,
  Input,
  List,
  Space,
  Switch,
  Tag,
  Tooltip,
  message,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  PlusOutlined,
  SearchOutlined,
  RobotOutlined,
  StopOutlined,
} from '@ant-design/icons';
import type { DiagnosisItem, IcdDiagnosis } from '@/types/outpatient';
import { useOutpatientStore } from '@/store/outpatientStore';
import {
  mockAIDifferentials,
  mockCDSReminders,
  mockCommonDiagnoses,
  mockIcdCatalog,
} from '@/mock/outpatientMock';
import { severityColor } from './constants';

export const DiagnosisPanel: React.FC = () => {
  const diagnoses = useOutpatientStore((s) => s.diagnoses);
  const addDiagnosis = useOutpatientStore((s) => s.addDiagnosis);
  const removeDiagnosis = useOutpatientStore((s) => s.removeDiagnosis);
  const confirmDiagnosis = useOutpatientStore((s) => s.confirmDiagnosis);
  const [kw, setKw] = useState('');
  const [showDifferential, setShowDifferential] = useState(true);

  const icdResults = useMemo(() => {
    const k = kw.trim();
    if (!k) return [];
    return mockIcdCatalog
      .filter((d) => d.name.includes(k) || d.code.toLowerCase().includes(k.toLowerCase()))
      .slice(0, 10);
  }, [kw]);

  const addDiagnosisByIcd = (icd: IcdDiagnosis, kind: DiagnosisItem['kind'] = 'primary') => {
    addDiagnosis({
      id: `DG${Date.now()}`,
      code: icd.code,
      name: icd.name,
      kind,
      confirmed: false,
    });
    message.success(`已添加诊断：${icd.name}`);
  };

  const primary = diagnoses.filter((d) => d.kind === 'primary');
  const secondary = diagnoses.filter((d) => d.kind === 'secondary');

  return (
    <div className="space-y-3">
      {/* ICD 搜索 */}
      <Card size="small" title={<span className="text-sm font-semibold">ICD-10 诊断搜索</span>}>
        <Input
          prefix={<SearchOutlined />}
          placeholder="输入诊断名称或 ICD 编码，如 心绞痛 / I20"
          value={kw}
          onChange={(e) => setKw(e.target.value)}
          allowClear
        />
        {kw && icdResults.length > 0 && (
          <List
            size="small"
            className="mt-2 border border-ink-border rounded"
            dataSource={icdResults}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Button
                    key="add"
                    size="small"
                    type="link"
                    onClick={() => addDiagnosisByIcd(item)}
                  >
                    主诊断
                  </Button>,
                  <Button
                    key="sub"
                    size="small"
                    type="link"
                    onClick={() => addDiagnosisByIcd(item, 'secondary')}
                  >
                    次诊断
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  title={<span>{item.name}</span>}
                  description={
                    <Space size={4}>
                      <Tag>{item.code}</Tag>
                      <span className="text-xs text-ink-secondary">{item.category}</span>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
        {kw && icdResults.length === 0 && (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="未匹配到 ICD 编码" />
        )}
      </Card>

      {/* 常见诊断快捷 */}
      <Card
        size="small"
        title={<span className="text-sm font-semibold">本科室常见诊断 Top10</span>}
      >
        <div className="flex flex-wrap gap-1.5">
          {mockCommonDiagnoses.map((d) => (
            <Tag
              key={d.code}
              color="geekblue"
              className="cursor-pointer"
              onClick={() => addDiagnosisByIcd(d)}
            >
              <PlusOutlined /> {d.name}
            </Tag>
          ))}
        </div>
      </Card>

      {/* 已开诊断 */}
      <Card
        size="small"
        title={<span className="text-sm font-semibold">诊断列表（{diagnoses.length}）</span>}
        extra={
          <Button
            size="small"
            type="primary"
            onClick={() => {
              diagnoses.forEach((d) => confirmDiagnosis(d.id));
              message.success('诊断已确认，进入处置环节');
            }}
          >
            全部确认
          </Button>
        }
      >
        {diagnoses.length === 0 && (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="尚未添加诊断" />
        )}
        {primary.length > 0 && (
          <div className="mb-2">
            <div className="text-xs text-ink-secondary mb-1">主要诊断</div>
            {primary.map((d) => (
              <DiagnosisRow
                key={d.id}
                item={d}
                onRemove={removeDiagnosis}
                onConfirm={confirmDiagnosis}
              />
            ))}
          </div>
        )}
        {secondary.length > 0 && (
          <div>
            <div className="text-xs text-ink-secondary mb-1">次要诊断</div>
            {secondary.map((d) => (
              <DiagnosisRow
                key={d.id}
                item={d}
                onRemove={removeDiagnosis}
                onConfirm={confirmDiagnosis}
              />
            ))}
          </div>
        )}
      </Card>

      {/* 鉴别诊断 */}
      <Card
        size="small"
        title={
          <Space>
            <span className="text-sm font-semibold">AI 鉴别诊断建议</span>
            <Switch size="small" checked={showDifferential} onChange={setShowDifferential} />
          </Space>
        }
      >
        {showDifferential &&
          mockAIDifferentials.map((df, idx) => (
            <div
              key={idx}
              className="mb-3 p-2 rounded bg-blue-50/50 border-l-2"
              style={{
                borderLeftColor:
                  severityColor[
                    df.likelihood === 'high'
                      ? 'danger'
                      : df.likelihood === 'medium'
                        ? 'warning'
                        : 'info'
                  ],
              }}
            >
              <div className="flex items-center justify-between">
                <Space>
                  <RobotOutlined style={{ color: '#0A4D8C' }} />
                  <span className="font-medium text-sm">{df.name}</span>
                  {df.code && <Tag>{df.code}</Tag>}
                  <Tag
                    color={
                      df.likelihood === 'high'
                        ? 'red'
                        : df.likelihood === 'medium'
                          ? 'orange'
                          : 'default'
                    }
                  >
                    {df.likelihood === 'high'
                      ? '高度可疑'
                      : df.likelihood === 'medium'
                        ? '中度可疑'
                        : '低度可疑'}
                  </Tag>
                </Space>
                <Button
                  size="small"
                  type="link"
                  onClick={() =>
                    addDiagnosisByIcd({
                      code: df.code ?? '',
                      name: df.name,
                      category: '',
                    } as IcdDiagnosis)
                  }
                >
                  采纳
                </Button>
              </div>
              <div className="mt-1 text-xs">
                <div className="text-medical-normal">支持点：{df.supports.join('；')}</div>
                <div className="text-medical-critical mt-0.5">不支持：{df.opposes.join('；')}</div>
              </div>
            </div>
          ))}
      </Card>

      {/* CDS 提醒 */}
      <Card size="small" title={<span className="text-sm font-semibold">临床决策支持（CDS）</span>}>
        <Space direction="vertical" className="w-full">
          {mockCDSReminders.map((r, idx) => (
            <Alert
              key={idx}
              type={
                r.level === 'danger'
                  ? 'error'
                  : r.level === 'warning'
                    ? 'warning'
                    : r.level === 'success'
                      ? 'success'
                      : 'info'
              }
              showIcon
              message={<span className="text-sm">{r.title}</span>}
              description={<span className="text-xs">{r.detail}</span>}
            />
          ))}
        </Space>
      </Card>
    </div>
  );
};

const DiagnosisRow: React.FC<{
  item: DiagnosisItem;
  onRemove: (id: string) => void;
  onConfirm: (id: string) => void;
}> = ({ item, onRemove, onConfirm }) => (
  <div className="flex items-center justify-between p-2 mb-1 bg-gray-50 rounded">
    <Space size={4}>
      {item.confirmed ? (
        <CheckCircleOutlined style={{ color: '#52C41A' }} />
      ) : (
        <StopOutlined style={{ color: '#FAAD14' }} />
      )}
      <span className="text-sm font-medium">{item.name}</span>
      <Tag>{item.code}</Tag>
      {item.note && <span className="text-xs text-ink-secondary">{item.note}</span>}
    </Space>
    <Space size={0}>
      {!item.confirmed && (
        <Tooltip title="确认诊断">
          <Button
            size="small"
            type="text"
            icon={<CheckCircleOutlined />}
            onClick={() => onConfirm(item.id)}
          />
        </Tooltip>
      )}
      <Tooltip title="移除">
        <Button
          size="small"
          type="text"
          danger
          icon={<CloseCircleOutlined />}
          onClick={() => onRemove(item.id)}
        />
      </Tooltip>
    </Space>
  </div>
);

export default DiagnosisPanel;
