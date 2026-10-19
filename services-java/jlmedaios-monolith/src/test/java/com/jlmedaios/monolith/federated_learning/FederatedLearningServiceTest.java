/*
 * 健澜科技 jlmedaios - 联邦学习 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.federated_learning;

import com.jlmedaios.monolith.federated_learning.entity.FederatedParticipant;
import com.jlmedaios.monolith.federated_learning.entity.FederatedTask;
import com.jlmedaios.monolith.federated_learning.service.FederatedLearningService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 联邦学习 Service 测试。
 */
@SpringBootTest
public class FederatedLearningServiceTest {

    @Autowired
    private FederatedLearningService federatedLearningService;

    @Test
    void testTaskList() {
        List<FederatedTask> list = federatedLearningService.taskList();
        assertNotNull(list);
    }

    @Test
    void testCreateTask() {
        FederatedTask task = federatedLearningService.createTask(
                "糖尿病风险预测", "疾病预测", 10);
        assertNotNull(task.getId());
        assertEquals("INITIALIZED", task.getStatus());
    }

    @Test
    void testStartTraining() {
        federatedLearningService.createTask("药物推荐-v1", "药物推荐", 5);
        FederatedTask started = federatedLearningService.startTraining("药物推荐-v1");
        assertNotNull(started);
        assertEquals("TRAINING", started.getStatus());
    }

    @Test
    void testParticipants() {
        List<FederatedParticipant> participants = federatedLearningService.participants("糖尿病风险预测");
        assertNotNull(participants);
    }
}
