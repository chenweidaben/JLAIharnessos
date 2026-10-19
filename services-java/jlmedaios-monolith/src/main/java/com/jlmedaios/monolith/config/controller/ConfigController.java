/*
 * 健澜科技 jlmedaios - 系统配置 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.config.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.config.entity.SystemConfig;
import com.jlmedaios.monolith.config.service.ConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * 系统配置 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/config")
public class ConfigController {

    private final ConfigService configService;

    /**
     * 查询配置。
     *
     * @param configKey 配置键
     * @return Result<SystemConfig>
     */
    @GetMapping("/{configKey}")
    public Result<SystemConfig> getConfig(@PathVariable String configKey) {
        return configService.getConfig(configKey)
                .map(Result::ok)
                .orElseGet(() -> Result.ok(null));
    }

    /**
     * 更新配置。
     *
     * @param configKey 配置键
     * @param body     {configValue, updatedBy}
     * @return Result<SystemConfig>
     */
    @PutMapping("/{configKey}")
    public Result<SystemConfig> updateConfig(@PathVariable String configKey,
                                              @RequestBody Map<String, Object> body) {
        return configService.updateConfig(
                configKey,
                String.valueOf(body.get("configValue")),
                String.valueOf(body.get("updatedBy"))
        ).map(Result::ok).orElseGet(() -> Result.ok(null));
    }

    /**
     * 按配置组查询配置列表。
     *
     * @param configGroup 配置组
     * @return Result<List<SystemConfig>>
     */
    @GetMapping("/group/{configGroup}")
    public Result<List<SystemConfig>> listByGroup(@PathVariable String configGroup) {
        return Result.ok(configService.listByGroup(configGroup));
    }
}
