/*
 * 健澜科技 jlmedaios - 患者满意度调查 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.patient_satisfaction.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.patient_satisfaction.entity.SurveyQuestion;
import com.jlmedaios.monolith.patient_satisfaction.entity.SurveyResponse;
import com.jlmedaios.monolith.patient_satisfaction.service.PatientSatisfactionService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 患者满意度调查 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/survey")
public class PatientSatisfactionController {

    private final PatientSatisfactionService patientSatisfactionService;

    /**
     * 调查问卷列表。
     *
     * @return Result<List<SurveyQuestion>>
     */
    @GetMapping("/questions")
    public Result<List<SurveyQuestion>> questionList() {
        return Result.ok(patientSatisfactionService.questionList());
    }

    /**
     * 提交满意度调查。
     *
     * @param body {responseNo, patientId, department, satisfactionScore, comments}
     * @return Result<SurveyResponse>
     */
    @PostMapping("/submit")
    public Result<SurveyResponse> submitSurvey(@RequestBody Map<String, Object> body) {
        SurveyResponse response = patientSatisfactionService.submitSurvey(
                String.valueOf(body.get("responseNo")),
                String.valueOf(body.get("patientId")),
                String.valueOf(body.get("department")),
                Integer.parseInt(String.valueOf(body.get("satisfactionScore"))),
                String.valueOf(body.get("comments"))
        );
        return Result.ok(response);
    }

    /**
     * 满意度统计。
     *
     * @return Result<Map<String, Object>>
     */
    @GetMapping("/stats")
    public Result<Map<String, Object>> stats() {
        return Result.ok(patientSatisfactionService.stats());
    }
}
