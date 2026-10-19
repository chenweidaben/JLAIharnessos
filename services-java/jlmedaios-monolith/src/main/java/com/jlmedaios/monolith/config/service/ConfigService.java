/*
 * 健澜科技 jlmedaios - 系统配置 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.config.service;

import com.jlmedaios.monolith.config.entity.SystemConfig;
import com.jlmedaios.monolith.config.repository.SystemConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * 系统配置 Service。
 *
 * <p>append-only: 配置变更留痕，审计日志关联</p>
 */
@Service
@RequiredArgsConstructor
public class ConfigService {

    private final SystemConfigRepository systemConfigRepository;

    /**
     * 查询配置。
     *
     * @param configKey 配置键
     * @return 配置 Optional
     */
    public Optional<SystemConfig> getConfig(String configKey) {
        return systemConfigRepository.findByConfigKey(configKey);
    }

    /**
     * 更新配置（配置变更必须留审计日志）。
     *
     * @param configKey   配置键
     * @param configValue 配置值
     * @param updatedBy   更新人
     * @return 已更新的配置
     */
    public Optional<SystemConfig> updateConfig(String configKey, String configValue, String updatedBy) {
        // 配置变更必须留审计日志（mock）
        Optional<SystemConfig> opt = systemConfigRepository.findByConfigKey(configKey);
        if (opt.isPresent()) {
            SystemConfig config = opt.get();
            config.setConfigValue(configValue);
            config.setUpdatedBy(updatedBy);
            config.setUpdatedAt(LocalDateTime.now());
            systemConfigRepository.save(config);
        }
        return opt;
    }

    /**
     * 按配置组查询配置列表。
     *
     * @param configGroup 配置组
     * @return 配置列表
     */
    public List<SystemConfig> listByGroup(String configGroup) {
        return systemConfigRepository.findByConfigGroup(configGroup);
    }
}
