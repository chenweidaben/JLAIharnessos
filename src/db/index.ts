/**
 * 健澜科技数智医院智能体 - 数据库模块入口
 *
 * 统一导出连接池、迁移执行器与所有 Repository。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export { closeDb, getDb, verifyDbConnection, withTx, type Sql, type TransactionSql } from './pool.js';
export { autoMigrate, runMigrations } from './migrate.js';
export * as patientRepo from './repositories/patientRepo.js';
export * as visitRepo from './repositories/visitRepo.js';
export * as orderRepo from './repositories/orderRepo.js';
export * as prescriptionRepo from './repositories/prescriptionRepo.js';
export * as medicalRecordRepo from './repositories/medicalRecordRepo.js';
export * as labResultRepo from './repositories/labResultRepo.js';
export * as drugRepo from './repositories/drugRepo.js';
export * as conversationRepo from './repositories/conversationRepo.js';
export * as auditRepo from './repositories/auditRepo.js';
export * as userRepo from './repositories/userRepo.js';
export * as wardRoundRepo from './repositories/wardRoundRepo.js';
export * as nursingRepo from './repositories/nursingRepo.js';
export * as orderAdministrationRepo from './repositories/orderAdministrationRepo.js';
