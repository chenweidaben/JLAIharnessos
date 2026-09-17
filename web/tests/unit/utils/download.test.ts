/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * download 文件下载测试
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { downloadBlob, exportCsv, exportJsonAsCsv } from '@/utils/download';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('downloadBlob', () => {
  it('创建 Blob URL 并触发 a 标签点击', () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const blob = new Blob(['test'], { type: 'text/plain' });
    downloadBlob(blob, 'report.txt');

    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });
});

describe('exportCsv', () => {
  it('生成 Blob 并下载', () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:csv-url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    exportCsv('name,age\n张三,58', 'patients.csv');

    expect(createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });
});

describe('exportJsonAsCsv', () => {
  it('空数组不生成文件', () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL');
    exportJsonAsCsv([], 'empty.csv');
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('对象数组转 CSV 并下载', () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:json-csv');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const rows = [
      { name: '张三', age: 58, dept: '内分泌科' },
      { name: '李四', age: 45, dept: '心内科' },
    ];
    exportJsonAsCsv(rows, 'patients.csv');

    expect(createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('含逗号/换行的字段被正确转义', () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:esc');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const rows = [{ name: '张,三', note: 'line1\nline2', comment: 'say "hi"' }];
    exportJsonAsCsv(rows, 'esc.csv');

    const blobArg = createObjectURL.mock.calls[0][0] as Blob;
    expect(blobArg).toBeInstanceOf(Blob);
  });
});
