/*
 * 健澜科技 jlmedaios - 患者满意度调查 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.patient_satisfaction;

import com.jlmedaios.monolith.patient_satisfaction.entity.SurveyResponse;
import com.jlmedaios.monolith.patient_satisfaction.service.PatientSatisfactionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 患者满意度调查 Service 测试。
 */
@SpringBootTest
public class PatientSatisfactionServiceTest {

    @Autowired
    private PatientSatisfactionService service;

    @Test
    void testSubmitSurveyNormal() {
        SurveyResponse response = service.submitSurvey("RESP-001", "P001",
                "心内科", 5, "非常满意");
        assertNotNull(response.getId());
        assertEquals(5, response.getSatisfactionScore());
    }

    @Test
    void testQuestionListNotNull() {
        assertNotNull(service.questionList());
    }

    @Test
    void testStatsNotNull() {
        assertNotNull(service.stats());
    }
}
