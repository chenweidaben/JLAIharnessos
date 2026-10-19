/*
 * 健澜科技 jlmedaios - 检验高级 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.lab_advanced.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.lab_advanced.entity.LabOrder;
import com.jlmedaios.monolith.lab_advanced.entity.LabResult;
import com.jlmedaios.monolith.lab_advanced.service.LabAdvancedService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 检验高级 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/lab")
public class LabAdvancedController {

    private final LabAdvancedService labAdvancedService;

    /**
     * 创建检验申请单。
     *
     * @param body {orderNo, patientId, testPanel, specimenType}
     * @return Result<LabOrder>
     */
    @PostMapping("/order")
    public Result<LabOrder> createOrder(@RequestBody Map<String, Object> body) {
        LabOrder order = labAdvancedService.createOrder(
                String.valueOf(body.get("orderNo")),
                String.valueOf(body.get("patientId")),
                String.valueOf(body.get("testPanel")),
                String.valueOf(body.get("specimenType"))
        );
        return Result.ok(order);
    }

    /**
     * 采样。
     *
     * @param id 申请单 ID
     * @return Result<LabOrder>
     */
    @PutMapping("/order/{id}/collect")
    public Result<LabOrder> collect(@PathVariable Long id) {
        return labAdvancedService.collect(id)
                .map(Result::ok).orElseGet(() -> Result.ok(null));
    }

    /**
     * 检验结果。
     *
     * @param orderNo 申请单编号
     * @return Result<List<LabResult>>
     */
    @GetMapping("/result/{orderNo}")
    public Result<List<LabResult>> results(@PathVariable String orderNo) {
        return Result.ok(labAdvancedService.results(orderNo));
    }

    /**
     * 异常结果列表。
     *
     * @return Result<List<LabResult>>
     */
    @GetMapping("/abnormal")
    public Result<List<LabResult>> abnormalResults() {
        return Result.ok(labAdvancedService.abnormalResults());
    }
}
