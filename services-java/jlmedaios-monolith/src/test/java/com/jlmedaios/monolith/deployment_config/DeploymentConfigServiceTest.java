/*
 * 健澜科技 jlmedaios - 部署配置 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.deployment_config;

import com.jlmedaios.monolith.deployment_config.entity.DeploymentConfig;
import com.jlmedaios.monolith.deployment_config.service.DeploymentConfigService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 部署配置 Service 测试。
 */
@SpringBootTest
public class DeploymentConfigServiceTest {

    @Autowired
    private DeploymentConfigService deploymentConfigService;

    @Test
    void testConfigList() {
        List<DeploymentConfig> list = deploymentConfigService.configList();
        assertNotNull(list);
    }

    @Test
    void testCreateConfig() {
        DeploymentConfig config = deploymentConfigService.createConfig(
                "monolith-prod", "prod", 3, "2CPU", "4Gi", "ssd", "v1.0.0");
        assertNotNull(config.getId());
        assertEquals("DEPLOYED", config.getStatus());
    }

    @Test
    void testScaleConfig() {
        deploymentConfigService.createConfig("ai-service-prod", "prod", 2, "4CPU", "8Gi", "gpu", "v1.0.0");
        DeploymentConfig scaled = deploymentConfigService.scaleConfig("ai-service-prod", 5);
        assertNotNull(scaled);
        assertEquals(5, scaled.getReplicas());
    }
}
