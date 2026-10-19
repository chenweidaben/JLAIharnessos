/*
 * 健澜科技 jlmedaios - 部署配置 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.deployment_config.service;

import com.jlmedaios.monolith.deployment_config.entity.DeploymentConfig;
import com.jlmedaios.monolith.deployment_config.repository.DeploymentConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 部署配置 Service。
 *
 * <p>部署配置主数据；生产接 k3s/ArgoCD，H2 下 mock</p>
 */
@Service
@RequiredArgsConstructor
public class DeploymentConfigService {

    private final DeploymentConfigRepository deploymentConfigRepository;

    /**
     * 配置列表。
     *
     * @return 部署配置列表
     */
    public List<DeploymentConfig> configList() {
        return deploymentConfigRepository.findAll();
    }

    /**
     * 创建配置。
     *
     * @param configName      配置名
     * @param environment     环境
     * @param replicas        副本数
     * @param cpuRequest      CPU 请求
     * @param memoryRequest   内存请求
     * @param storageClass    存储类
     * @param imageTag        镜像标签
     * @return 已持久化的部署配置
     */
    public DeploymentConfig createConfig(String configName, String environment, Integer replicas,
                                          String cpuRequest, String memoryRequest,
                                          String storageClass, String imageTag) {
        DeploymentConfig config = DeploymentConfig.builder()
                .configName(configName)
                .environment(environment)
                .replicas(replicas)
                .cpuRequest(cpuRequest)
                .memoryRequest(memoryRequest)
                .storageClass(storageClass)
                .imageTag(imageTag)
                .build();
        return deploymentConfigRepository.save(config);
    }

    /**
     * 调整副本数。
     *
     * @param configName 配置名
     * @param replicas   副本数
     * @return 已更新的部署配置
     */
    public DeploymentConfig scaleConfig(String configName, Integer replicas) {
        List<DeploymentConfig> configs = deploymentConfigRepository.findByConfigName(configName);
        if (!configs.isEmpty()) {
            DeploymentConfig config = configs.get(0);
            config.setReplicas(replicas);
            config.setStatus("UPDATING");
            return deploymentConfigRepository.save(config);
        }
        return null;
    }
}
