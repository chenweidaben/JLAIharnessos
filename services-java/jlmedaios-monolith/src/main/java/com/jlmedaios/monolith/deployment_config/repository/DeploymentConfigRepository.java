/*
 * 健澜科技 jlmedaios - 部署配置 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.deployment_config.repository;

import com.jlmedaios.monolith.deployment_config.entity.DeploymentConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 部署配置 Repository。
 */
@Repository
public interface DeploymentConfigRepository extends JpaRepository<DeploymentConfig, Long> {

    /**
     * 按环境查询部署配置。
     *
     * @param environment 环境
     * @return 部署配置列表
     */
    List<DeploymentConfig> findByEnvironment(String environment);

    /**
     * 按配置名查询部署配置。
     *
     * @param configName 配置名
     * @return 部署配置列表
     */
    List<DeploymentConfig> findByConfigName(String configName);
}
