/*
 * 健澜科技 jlmedaios - 患者满意度调查 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.patient_satisfaction.service;

import com.jlmedaios.monolith.patient_satisfaction.entity.SurveyQuestion;
import com.jlmedaios.monolith.patient_satisfaction.entity.SurveyResponse;
import com.jlmedaios.monolith.patient_satisfaction.repository.SurveyQuestionRepository;
import com.jlmedaios.monolith.patient_satisfaction.repository.SurveyResponseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 患者满意度调查 Service。
 *
 * <p>append-only: 满意度评分不可修改</p>
 */
@Service
@RequiredArgsConstructor
public class PatientSatisfactionService {

    private final SurveyQuestionRepository surveyQuestionRepository;
    private final SurveyResponseRepository surveyResponseRepository;

    /**
     * 调查问卷列表。
     *
     * @return 问题列表
     */
    public List<SurveyQuestion> questionList() {
        return surveyQuestionRepository.findAll();
    }

    /**
     * 提交满意度调查。
     *
     * @param responseNo      响应编号
     * @param patientId        患者 ID
     * @param department       科室
     * @param satisfactionScore 满意度评分（1-5）
     * @param comments        评论
     * @return 已持久化的评分
     */
    public SurveyResponse submitSurvey(String responseNo, String patientId, String department,
                                        int satisfactionScore, String comments) {
        SurveyResponse response = SurveyResponse.builder()
                .responseNo(responseNo)
                .patientId(patientId)
                .department(department)
                .satisfactionScore(satisfactionScore)
                .comments(comments)
                .build();
        return surveyResponseRepository.save(response);
    }

    /**
     * 满意度统计（mock）。
     *
     * @return 统计数据
     */
    public Map<String, Object> stats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("avg_score", 4.2);
        stats.put("by_department", List.of(
                Map.of("dept", "心内科", "avg", 4.5),
                Map.of("dept", "骨科", "avg", 4.0)
        ));
        stats.put("by_category", List.of(
                Map.of("category", "服务态度", "avg", 4.6),
                Map.of("category", "等待时间", "avg", 3.8)
        ));
        return stats;
    }
}
