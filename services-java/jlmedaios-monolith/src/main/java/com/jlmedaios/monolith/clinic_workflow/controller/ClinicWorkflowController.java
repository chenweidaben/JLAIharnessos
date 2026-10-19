/*
 * 健澜科技 jlmedaios - 门诊工作流 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.clinic_workflow.controller;

import com.jlmedaios.monolith.clinic_workflow.entity.ClinicSession;
import com.jlmedaios.monolith.clinic_workflow.service.ClinicWorkflowService;
import com.jlmedaios.monolith.common.Result;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 门诊工作流 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/clinic")
public class ClinicWorkflowController {

    private final ClinicWorkflowService clinicWorkflowService;

    /**
     * 创建门诊就诊会话。
     *
     * @param body {sessionNo, patientId, department, doctorId}
     * @return Result<ClinicSession>
     */
    @PostMapping("/session/create")
    public Result<ClinicSession> createSession(@RequestBody Map<String, Object> body) {
        ClinicSession session = clinicWorkflowService.createSession(
                String.valueOf(body.get("sessionNo")),
                String.valueOf(body.get("patientId")),
                String.valueOf(body.get("department")),
                String.valueOf(body.get("doctorId"))
        );
        return Result.ok(session);
    }

    /**
     * 更新流程节点。
     *
     * @param id   会话 ID
     * @param body {step}
     * @return Result<ClinicSession>
     */
    @PutMapping("/session/{id}/step")
    public Result<ClinicSession> updateStep(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return clinicWorkflowService.updateStep(id, String.valueOf(body.get("step")))
                .map(Result::ok).orElseGet(() -> Result.ok(null));
    }

    /**
     * 就诊时间线。
     *
     * @param id 会话 ID
     * @return Result<Map<String, Object>>
     */
    @GetMapping("/session/{id}/timeline")
    public Result<Map<String, Object>> timeline(@PathVariable Long id) {
        return Result.ok(clinicWorkflowService.timeline(id));
    }

    /**
     * 门诊流程统计。
     *
     * @return Result<Map<String, Object>>
     */
    @GetMapping("/workflow/stats")
    public Result<Map<String, Object>> stats() {
        return Result.ok(clinicWorkflowService.stats());
    }
}
