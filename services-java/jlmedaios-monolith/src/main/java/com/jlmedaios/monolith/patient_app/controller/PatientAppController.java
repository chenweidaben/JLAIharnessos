/*
 * 健澜科技 jlmedaios - 患者 APP Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.patient_app.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.patient_app.service.PatientAppService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 患者 APP Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/patientapp")
public class PatientAppController {

    private final PatientAppService patientAppService;

    /**
     * 患者 APP 功能菜单。
     *
     * @return Result<List<Map<String, Object>>>
     */
    @GetMapping("/menu")
    public Result<List<Map<String, Object>>> menu() {
        return Result.ok(patientAppService.menu());
    }

    /**
     * 患者消息推送。
     *
     * @param patientId 患者 ID（从 header 或 token 获取，这里简化为参数）
     * @return Result<List<Map<String, Object>>>
     */
    @GetMapping("/notifications")
    public Result<List<Map<String, Object>>> notifications(@RequestHeader(value = "X-Patient-Id", required = false) String patientId) {
        return Result.ok(patientAppService.notifications(patientId));
    }

    /**
     * 设置偏好。
     *
     * @param body {patientId, preferenceJson}
     * @return Result<Map<String, Object>>
     */
    @PutMapping("/preference")
    public Result<Map<String, Object>> preference(@RequestBody Map<String, Object> body) {
        return Result.ok(patientAppService.preference(
                String.valueOf(body.get("patientId")),
                String.valueOf(body.get("preferenceJson"))
        ));
    }
}
