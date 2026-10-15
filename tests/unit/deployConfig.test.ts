/**
 * 健澜科技 jlmedaios - M145-D 部署配置生成单测（生产化收尾）
 *
 * 验证纯函数层三份产物的关键性质：
 *  - generateDockerCompose：三服务齐备、命名卷持久化、restart 策略、日志轮转、
 *    域名/端口/镜像被正确注入；同入参文本确定；
 *  - generateNginxConfig：域名与证书路径正确、80->443 跳转、TLS 协议、
 *    /api 反代到本地 bff、私钥路径由 fullchain.pem 正确推导；且不含 WebSocket Upgrade 块；
 *  - generateBackupPolicy：全备 cron、WAL 归档、保留期、异地副本、任务清单与月度演练齐备。
 * 全部为纯函数断言，不依赖数据库与网络。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';

import {
  DEFAULT_APP_IMAGE,
  generateBackupPolicy,
  generateDockerCompose,
  generateNginxConfig,
} from '../../src/bff/aggregators/deployConfigAggregator';

describe('M145-D 部署配置生成', () => {
  describe('generateDockerCompose', () => {
    const compose = generateDockerCompose({
      domain: 'hospital.example.com',
      httpPort: 9090,
      appImage: 'jlmedaios/bff:v1.0.0',
    });

    it('三服务齐备：postgres / redis / bff', () => {
      expect(compose).toMatch(/postgres:/);
      expect(compose).toMatch(/redis:/);
      expect(compose).toMatch(/bff:/);
    });

    it('持久化与高可用：命名卷 + restart: always + 健康检查', () => {
      expect(compose).toMatch(/pg_data:/);
      expect(compose).toMatch(/redis_data:/);
      expect(compose).toMatch(/restart: always/);
      expect(compose).toMatch(/pg_isready/);
    });

    it('日志轮转：json-file 驱动 max-size / max-file', () => {
      expect(compose).toContain('max-size: "10m"');
      expect(compose).toContain('max-file: "3"');
    });

    it('入参被正确注入：域名、端口、镜像', () => {
      expect(compose).toContain('hospital.example.com');
      expect(compose).toContain('127.0.0.1:9090:8080');
      expect(compose).toContain('jlmedaios/bff:v1.0.0');
    });

    it('安全收敛：bff 仅绑定 127.0.0.1，不暴露数据库公网端口', () => {
      expect(compose).toContain('127.0.0.1:9090:8080');
      // 不应出现对 0.0.0.0:5432 的公网暴露
      expect(compose).not.toContain('5432:5432');
    });

    it('纯函数确定性：同入参必得同文本', () => {
      const again = generateDockerCompose({
        domain: 'hospital.example.com',
        httpPort: 9090,
        appImage: 'jlmedaios/bff:v1.0.0',
      });
      expect(again).toBe(compose);
    });

    it('默认值：缺省镜像标签与端口回退', () => {
      const minimal = generateDockerCompose({ domain: 'minimal.example.com' });
      expect(minimal).toContain(DEFAULT_APP_IMAGE);
      expect(minimal).toContain('127.0.0.1:8080:8080');
    });
  });

  describe('generateNginxConfig', () => {
    const cert = '/etc/nginx/ssl/fullchain.pem';
    const nginx = generateNginxConfig('hospital.example.com', cert);

    it('域名与证书路径正确写入', () => {
      expect(nginx).toContain('server_name hospital.example.com;');
      expect(nginx).toContain('ssl_certificate     /etc/nginx/ssl/fullchain.pem;');
    });

    it('私钥路径由 fullchain.pem 正确推导为 privkey.pem', () => {
      expect(nginx).toContain('ssl_certificate_key /etc/nginx/ssl/privkey.pem;');
    });

    it('80 强制跳转 443，启用 TLS1.2/1.3', () => {
      expect(nginx).toContain('return 301 https://$host$request_uri;');
      expect(nginx).toContain('listen 443 ssl;');
      expect(nginx).toContain('TLSv1.2 TLSv1.3');
    });

    it('/api 反向代理到本地 bff，安全响应头齐备', () => {
      expect(nginx).toContain('location /api/');
      expect(nginx).toContain('proxy_pass http://jlm_bff;');
      expect(nginx).toContain('X-Frame-Options SAMEORIGIN');
      expect(nginx).toContain('Strict-Transport-Security');
    });

    it('不含 WebSocket Upgrade 代理指令（WS 由边缘网关托管）', () => {
      // 注释里允许出现 "WebSocket" 字样，但配置正文不得出现真正的升级代理头
      expect(nginx).not.toMatch(/proxy_set_header\s+Upgrade/i);
      expect(nginx).not.toMatch(/proxy_set_header\s+Connection\s+upgrade/i);
    });
  });

  describe('generateBackupPolicy 备份策略', () => {
    const policy = generateBackupPolicy();

    it('全备计划 + WAL 归档 + 保留期', () => {
      expect(policy.fullBackupCron).toBe('0 2 * * *');
      expect(policy.walArchive).toBe(true);
      expect(policy.retentionDays).toBe(30);
    });

    it('异地副本与月度恢复演练开启', () => {
      expect(policy.offsiteCopy).toBe(true);
      expect(policy.offsiteWeeklyDay).toBe(0);
      expect(policy.verifyRestoreMonthly).toBe(true);
    });

    it('任务清单覆盖 pg_dump / redis / offsite 三类', () => {
      const names = policy.jobs.map((j) => j.name);
      expect(names).toContain('pg_dump_full');
      expect(names).toContain('redis_rdb');
      expect(names).toContain('offsite_sync');
      expect(policy.jobs.length).toBeGreaterThanOrEqual(3);
    });
  });
});
