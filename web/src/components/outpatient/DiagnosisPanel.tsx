/**
 * 健澜科技 jlmedaios - 诊断辅助面板（真实接口）
 *
 * ICD-10 搜索、常见诊断快捷、诊断列表（确认/移除）、临床决策支持（CDS）。
 * 诊断与 CDS 均来自 BFF 真实计算与持久化；AI 鉴别诊断统一由“AI 助手”页提供，
 * 本面板不再内置写死的鉴别结论。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Empty,
  Input,
  List,
  Space,
  Spin,
  Tag,
  Tooltip,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  PlusOutlined,
  SearchOutlined,
  StopOutlined,
} from '@ant-design/icons';
import type {
  DiagnosisCatalog,
  DiagnosisItem,
  PrescriptionWarning,
} from '@/types/outpatient';
import { useOutpatientStore } from '@/store/outpatientStore';
import {
  fetchDiagnosisCatalog,
  searchDiagnosisCatalog,
} from '@/services/api/outpatient';

export const DiagnosisPanel: React.FC = () => {
  const diagnoses = useOutpatientStore((s) => s.diagnoses);
  const addDiagnosis = useOutpatientStore((s) => s.addDiagnosis);
  const removeDiagnosis = useOutpatientStore((s) => s.removeDiagnosis);
  const confirmDiagnosis = useOutpatientStore((s) => s.confirmDiagnosis);
  const cdsReminders = useOutpatientStore((s) => s.cdsReminders);

  const [kw, setKw] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<DiagnosisCatalog[]>([]);
  const [common, setCommon] = useState<DiagnosisCatalog[]>([]);

  // 加载常见诊断快捷
  useEffect(() => {
    let alive = true;
    fetchDiagnosisCatalog()
      .then((data) => {
        if (alive) setCommon(data.common ?? []);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  // 关键字 ICD 搜索（服务端，带防抖）
  useEffect(() => {
    const k = kw.trim();
    if (!k) {
      setResults([]);
      return undefined;
    }
    let alive = true;
    setSearching(true);
    const timer = setTimeout(() => {
      searchDiagnosisCatalog(k)
        .then((list) => {
          if (alive) setResults(list);
        })
        .catch(() => undefined)
        .finally(() => {
          if (alive) setSearching(false);
        });
    }, 250);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [kw]);

  const addByCatalog = (
    item: DiagnosisCatalog,
    kind: DiagnosisItem['kind'] = 'primary',
  ): void => {
    addDiagnosis({ code: item.code, name: item.name, kind });
  };

  const primary = useMemo(() => diagnoses.filter((d) => d.kind === 'primary'), [diagnoses]);
  const secondary = useMemo(
    () => diagnoses.filter((d) => d.kind === 'secondary'),
    [diagnoses],
  );

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
        {kw.trim() && (
          <div className="mt-2">
            {searching ? (
              <div className="py-4 text-center">
                <Spin size="small" />
              </div>
            ) : results.length > 0 ? (
              <List
                size="small"
                className="border border-ink-border rounded"
                dataSource={results}
                renderItem={(item) => (
                  <List.Item
                    actions={[
                      <Button
                        key="add"
                        size="small"
                        type="link"
                        onClick={() => addByCatalog(item)}
                      >
                        主诊断
                      </Button>,
                      <Button
                        key="sub"
                        size="small"
                        type="link"
                        onClick={() => addByCatalog(item, 'secondary')}
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
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="未匹配到 ICD 编码"
              />
            )}
          </div>
        )}
      </Card>

      {/* 常见诊断快捷 */}
      {common.length > 0 && (
        <Card
          size="small"
          title={<span className="text-sm font-semibold">本科室常见诊断</span>}
        >
          <div className="flex flex-wrap gap-1.5">
            {common.map((d) => (
              <Tag
                key={d.code}
                color="geekblue"
                className="cursor-pointer"
                onClick={() => addByCatalog(d)}
              >
                <PlusOutlined /> {d.name}
              </Tag>
            ))}
          </div>
        </Card>
      )}

      {/* 已开诊断 */}
      <Card
        size="small"
        title={<span className="text-sm font-semibold">诊断列表（{diagnoses.length}）</span>}
        extra={
          <Button
            size="small"
            type="primary"
            onClick={() => {
              diagnoses
                .filter((d) => !d.confirmed)
                .forEach((d) => confirmDiagnosis(d.id, true));
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

      {/* CDS 提醒（真实计算） */}
      <Card
        size="small"
        title={<span className="text-sm font-semibold">临床决策支持（CDS）</span>}
      >
        {cdsReminders.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="当前无 CDS 提醒"
          />
        ) : (
          <Space direction="vertical" className="w-full">
            {cdsReminders.map((r: PrescriptionWarning, idx) => (
              <Alert
                key={idx}
                type={
                  r.level === 'danger'
                    ? 'error'
                    : r.level === 'warning'
                      ? 'warning'
                      : 'info'
                }
                showIcon
                message={<span className="text-sm">{r.title}</span>}
                description={<span className="text-xs">{r.detail}</span>}
              />
            ))}
          </Space>
        )}
      </Card>
    </div>
  );
};

const DiagnosisRow: React.FC<{
  item: DiagnosisItem;
  onRemove: (id: string) => void;
  onConfirm: (id: string, confirmed: boolean) => void;
}> = ({ item, onRemove, onConfirm }) => (
  <div className="flex items-center justify-between p-2 mb-1 bg-gray-50 rounded">
    <Space size={4}>
      {item.confirmed ? (
        <CheckCircleOutlined style={{ color: '#52C41A' }} />
      ) : (
        <StopOutlined style={{ color: '#FAAD14' }} />
      )}
      <span className="text-sm font-medium">{item.name}</span>
      {item.code && <Tag>{item.code}</Tag>}
      {item.note && <span className="text-xs text-ink-secondary">{item.note}</span>}
    </Space>
    <Space size={0}>
      {!item.confirmed && (
        <Tooltip title="确认诊断">
          <Button
            size="small"
            type="text"
            icon={<CheckCircleOutlined />}
            onClick={() => onConfirm(item.id, true)}
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
