/*
 * 健澜科技 jlmedaios - 部署配置 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.deployment_config.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.deployment_config.entity.DeploymentConfig;
import com.jlmedaios.monolith.deployment_config.service.DeploymentConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 部署配置 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/deploy")
public class DeploymentConfigController {

    private final DeploymentConfigService deploymentConfigService;

    /**
     * 配置列表。
     *
     * @return Result<List<DeploymentConfig>>
     */
    @GetMapping("/configs")
    public Result<List<DeploymentConfig>> configList() {
        return Result.ok(deploymentConfigService.configList());
    }

    /**
     * 创建配置。
     *
     * @param body {configName, environment, replicas, cpuRequest, memoryRequest, storageClass, imageTag}
     * @return Result<DeploymentConfig>
     */
    @PostMapping("/config")
    public Result<DeploymentConfig> createConfig(@RequestBody Map<String, Object> body) {
        DeploymentConfig config = deploymentConfigService.createConfig(
                String.valueOf(body.get("configName")),
                String.valueOf(body.get("environment")),
                Integer.valueOf(String.valueOf(body.get("replicas"))),
                String.valueOf(body.get("cpuRequest")),
                String.valueOf(body.get("memoryRequest")),
                String.valueOf(body.get("storageClass")),
                String.valueOf(body.get("imageTag"))
        );
        return Result.ok(config);
    }

    /**
     * 调整副本数。
     *
     * @param name 配置名
     * @param body {replicas}
     * @return Result<DeploymentConfig>
     */
    @PutMapping("/config/{name}/scale")
    public Result<DeploymentConfig> scaleConfig(@PathVariable String name,
                                                 @RequestBody Map<String, Object> body) {
        return Result.ok(deploymentConfigService.scaleConfig(
                name,
                Integer.valueOf(String.valueOf(body.get("replicas")))
        ));
    }
}
