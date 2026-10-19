/*
 * 健澜科技 jlmedaios - 检验工作站 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.lab_workstation.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.lab_workstation.entity.LabWorkItem;
import com.jlmedaios.monolith.lab_workstation.service.LabWorkstationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 检验工作站 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/lab")
public class LabWorkstationController {

    private final LabWorkstationService labWorkstationService;

    /**
     * 待处理标本列表。
     *
     * @return Result<List<LabWorkItem>>
     */
    @GetMapping("/pending")
    public Result<List<LabWorkItem>> pendingItems() {
        return Result.ok(labWorkstationService.pendingItems());
    }

    /**
     * 接收标本。
     *
     * @param workItemNo 工作项编号
     * @return Result<LabWorkItem>
     */
    @PutMapping("/{workItemNo}/receive")
    public Result<LabWorkItem> receiveSample(@PathVariable String workItemNo) {
        return Result.ok(labWorkstationService.receiveSample(workItemNo));
    }

    /**
     * 录入结果。
     *
     * @param workItemNo 工作项编号
     * @param body       {resultValues}
     * @return Result<LabWorkItem>
     */
    @PutMapping("/{workItemNo}/result")
    public Result<LabWorkItem> inputResult(@PathVariable String workItemNo,
                                            @RequestBody Map<String, Object> body) {
        return Result.ok(labWorkstationService.inputResult(workItemNo,
                String.valueOf(body.get("resultValues"))));
    }

    /**
     * 审核发布。
     *
     * @param workItemNo 工作项编号
     * @return Result<LabWorkItem>
     */
    @PutMapping("/{workItemNo}/review")
    public Result<LabWorkItem> reviewPublish(@PathVariable String workItemNo) {
        return Result.ok(labWorkstationService.reviewPublish(workItemNo));
    }
}
