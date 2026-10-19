/*
 * 健澜科技 jlmedaios - AI 训练数据管理 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.ai_training_data;

import com.jlmedaios.monolith.ai_training_data.entity.TrainingDataset;
import com.jlmedaios.monolith.ai_training_data.service.AiTrainingDataService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * AI 训练数据管理 Service 测试。
 */
@SpringBootTest
public class AiTrainingDataServiceTest {

    @Autowired
    private AiTrainingDataService aiTrainingDataService;

    @Test
    void testDatasetList() {
        List<TrainingDataset> list = aiTrainingDataService.datasetList();
        assertNotNull(list);
    }

    @Test
    void testCreateDataset() {
        TrainingDataset dataset = aiTrainingDataService.createDataset(
                "病历结构化-v1", "病历结构化", 5000, "张三");
        assertNotNull(dataset.getId());
        assertEquals("COLLECTING", dataset.getStatus());
    }

    @Test
    void testPublishVersion() {
        aiTrainingDataService.createDataset("CDSS规则集", "CDSS", 3000, "李四");
        TrainingDataset published = aiTrainingDataService.publishVersion("CDSS规则集", "v1.0");
        assertNotNull(published);
        assertEquals("PUBLISHED", published.getStatus());
    }
}
