/*
 * 健澜科技 jlmedaios - 系统配置 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.config.repository;

import com.jlmedaios.monolith.config.entity.SystemConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * 系统配置 Repository。
 */
@Repository
public interface SystemConfigRepository extends JpaRepository<SystemConfig, Long> {

    /**
     * 按配置键查询配置。
     *
     * @param configKey 配置键
     * @return 配置 Optional
     */
    Optional<SystemConfig> findByConfigKey(String configKey);

    /**
     * 按配置组查询配置列表。
     *
     * @param configGroup 配置组
     * @return 配置列表
     */
    List<SystemConfig> findByConfigGroup(String configGroup);
}
