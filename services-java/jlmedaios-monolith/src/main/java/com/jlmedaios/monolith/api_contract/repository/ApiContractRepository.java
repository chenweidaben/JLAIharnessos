/*
 * 健澜科技 jlmedaios - API 契约 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.api_contract.repository;

import com.jlmedaios.monolith.api_contract.entity.ApiContract;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * API 契约 Repository。
 */
@Repository
public interface ApiContractRepository extends JpaRepository<ApiContract, Long> {

    /**
     * 按状态查询 API 契约。
     *
     * @param status 状态
     * @return API 契约列表
     */
    List<ApiContract> findByStatus(String status);

    /**
     * 按模块名查询 API 契约。
     *
     * @param moduleName 模块名
     * @return API 契约列表
     */
    List<ApiContract> findByModuleName(String moduleName);

    /**
     * 按契约编码查询 API 契约（P8 性能优化：替代 findAll().filter()）。
     *
     * @param contractCode 契约编码
     * @return API 契约
     */
    ApiContract findByContractCode(String contractCode);
}
