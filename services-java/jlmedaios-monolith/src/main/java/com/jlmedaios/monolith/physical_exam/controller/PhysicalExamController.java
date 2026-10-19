/*
 * 健澜科技 jlmedaios - 体检管理 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.physical_exam.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.physical_exam.entity.PhysicalExamOrder;
import com.jlmedaios.monolith.physical_exam.service.PhysicalExamService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * 体检管理 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/physical-exam")
public class PhysicalExamController {

    private final PhysicalExamService physicalExamService;

    /**
     * 创建体检订单。
     *
     * @param body {customerName, age, gender, examPackage, totalFee}
     * @return Result<PhysicalExamOrder>
     */
    @PostMapping("/order")
    public Result<PhysicalExamOrder> order(@RequestBody Map<String, Object> body) {
        PhysicalExamOrder order = physicalExamService.order(
                String.valueOf(body.get("customerName")),
                Integer.valueOf(String.valueOf(body.get("age"))),
                String.valueOf(body.get("gender")),
                String.valueOf(body.get("examPackage")),
                new BigDecimal(String.valueOf(body.get("totalFee")))
        );
        return Result.ok(order);
    }

    /**
     * 完成体检。
     *
     * @param id 订单 ID
     * @return Result<PhysicalExamOrder>
     */
    @PutMapping("/{id}/complete")
    public Result<PhysicalExamOrder> complete(@PathVariable Long id) {
        return physicalExamService.complete(id)
                .map(Result::ok)
                .orElseGet(() -> Result.ok(null));
    }

    /**
     * 今日体检队列。
     *
     * @return Result<List<PhysicalExamOrder>>
     */
    @GetMapping("/today")
    public Result<List<PhysicalExamOrder>> todayList() {
        return Result.ok(physicalExamService.todayList());
    }
}
