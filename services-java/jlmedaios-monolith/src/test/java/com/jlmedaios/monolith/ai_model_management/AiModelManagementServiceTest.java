/*
 * 健澜科技 jlmedaios - AI 模型管理 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.ai_model_management;

import com.jlmedaios.monolith.ai_model_management.entity.AiModel;
import com.jlmedaios.monolith.ai_model_management.service.AiModelManagementService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * AI 模型管理 Service 测试。
 */
@SpringBootTest
public class AiModelManagementServiceTest {

    @Autowired
    private AiModelManagementService aiModelManagementService;

    @Test
    void testModelList() {
        List<AiModel> list = aiModelManagementService.modelList();
        assertNotNull(list);
    }

    @Test
    void testDeployModel() {
        AiModel model = aiModelManagementService.deployModel(
                "qwen-7b-awq", "v1.0", "PyTorch", "病历结构化");
        assertNotNull(model.getId());
        assertEquals("RUNNING", model.getStatus());
    }

    @Test
    void testStopModel() {
        aiModelManagementService.deployModel("bge-large", "v1.0", "PyTorch", "CDSS");
        AiModel stopped = aiModelManagementService.stopModel("bge-large");
        assertNotNull(stopped);
        assertEquals("STOPPED", stopped.getStatus());
    }

    @Test
    void testModelMetrics() {
        Map<String, Object> metrics = aiModelManagementService.modelMetrics("qwen-7b-awq");
        assertNotNull(metrics);
        assertTrue(metrics.containsKey("accuracy"));
    }
}
