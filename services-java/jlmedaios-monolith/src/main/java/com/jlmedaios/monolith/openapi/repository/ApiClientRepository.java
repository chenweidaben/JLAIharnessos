/*
 * 健澜科技 jlmedaios - API 客户 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.openapi.repository;

import com.jlmedaios.monolith.openapi.entity.ApiClient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * API 客户 Repository。
 */
@Repository
public interface ApiClientRepository extends JpaRepository<ApiClient, Long> {

    /**
     * 按 appKey 查询客户。
     *
     * @param appKey appKey
     * @return 客户 Optional
     */
    Optional<ApiClient> findByAppKey(String appKey);

    /**
     * 按状态查询客户列表。
     *
     * @param status 状态
     * @return 客户列表
     */
    List<ApiClient> findByStatus(String status);
}
