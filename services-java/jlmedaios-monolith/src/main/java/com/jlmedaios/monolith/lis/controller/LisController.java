/*
 * 健澜科技 jlmedaios - 检验对接 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.lis.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.lis.entity.LisRequest;
import com.jlmedaios.monolith.lis.service.LisService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 检验对接 Controller。
 * TODO: 对接 LIS 系统 HL7 v2.x / FHIR R4 接口。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/lis")
public class LisController {

    private final LisService lisService;

    /**
     * 申请检验。
     *
     * @param body {patientId, testCode, testName}
     * @return Result<LisRequest>
     */
    @PostMapping("/request")
    public Result<LisRequest> request(@RequestBody Map<String, Object> body) {
        Long patientId = Long.valueOf(String.valueOf(body.get("patientId")));
        String testCode = String.valueOf(body.get("testCode"));
        String testName = String.valueOf(body.get("testName"));
        return Result.ok(lisService.request(patientId, testCode, testName));
    }

    /**
     * 查询检验结果。
     *
     * @param requestId 检验申请 ID
     * @return Result<LisRequest>
     */
    @GetMapping("/result/{requestId}")
    public Result<LisRequest> getResult(@PathVariable Long requestId) {
        return lisService.getResult(requestId)
                .map(Result::ok)
                .orElseGet(() -> Result.fail(404, "检验申请不存在"));
    }
}
