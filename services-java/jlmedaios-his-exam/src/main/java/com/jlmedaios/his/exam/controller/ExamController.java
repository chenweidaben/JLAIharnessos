/*
 * 健澜科技 jlmedaios - 检查对接 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.his.exam.controller;

import com.jlmedaios.his.exam.common.Result;
import com.jlmedaios.his.exam.entity.ExamRequest;
import com.jlmedaios.his.exam.service.ExamService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * 检查对接 Controller。
 * TODO: 对接 RIS/PACS HL7 v2.x / DICOM 接口。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/his/exam")
public class ExamController {

    private final ExamService examService;

    /**
     * 申请检查。
     *
     * @param body {patientId, examType}
     * @return Result<ExamRequest>
     */
    @PostMapping("/request")
    public Result<ExamRequest> request(@RequestBody Map<String, Object> body) {
        Long patientId = Long.valueOf(String.valueOf(body.get("patientId")));
        String examType = String.valueOf(body.get("examType"));
        return Result.ok(examService.request(patientId, examType));
    }

    /**
     * 查询检查结果。
     *
     * @param requestId 检查申请 ID
     * @return Result<ExamRequest>
     */
    @GetMapping("/result/{requestId}")
    public Result<ExamRequest> getResult(@PathVariable Long requestId) {
        return examService.getResult(requestId)
                .map(Result::ok)
                .orElseGet(() -> Result.fail(404, "检查申请不存在"));
    }

    /**
     * 排程：列出所有待排程的检查。
     *
     * @return Result<List<ExamRequest>>
     */
    @GetMapping("/schedule")
    public Result<List<ExamRequest>> schedule() {
        return Result.ok(examService.schedule());
    }
}
