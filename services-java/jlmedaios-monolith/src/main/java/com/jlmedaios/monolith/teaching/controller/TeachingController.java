/*
 * 健澜科技 jlmedaios - 教学培训 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.teaching.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.teaching.entity.TeachingTask;
import com.jlmedaios.monolith.teaching.service.TeachingService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * 教学培训 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/teaching")
public class TeachingController {

    private final TeachingService teachingService;

    /**
     * 创建教学任务。
     *
     * @param body {taskType, topic, teacherId, deptCode, date, durationHours, studentCount}
     * @return Result<TeachingTask>
     */
    @PostMapping("/task")
    public Result<TeachingTask> create(@RequestBody Map<String, Object> body) {
        TeachingTask task = teachingService.create(
                String.valueOf(body.get("taskType")),
                String.valueOf(body.get("topic")),
                String.valueOf(body.get("teacherId")),
                String.valueOf(body.get("deptCode")),
                LocalDate.parse(String.valueOf(body.get("date"))),
                new BigDecimal(String.valueOf(body.get("durationHours"))),
                Integer.valueOf(String.valueOf(body.get("studentCount")))
        );
        return Result.ok(task);
    }

    /**
     * 科室月度教学统计（mock）。
     *
     * @param deptCode 科室编码
     * @param year     年份
     * @param month    月份
     * @return Result<Map<String, Object>>
     */
    @GetMapping("/dept/{deptCode}/month")
    public Result<Map<String, Object>> deptMonthStats(@PathVariable String deptCode,
                                                       @RequestParam int year,
                                                       @RequestParam int month) {
        return Result.ok(teachingService.deptMonthStats(deptCode, year, month));
    }

    /**
     * 教师教学历史。
     *
     * @param teacherId 教师工号
     * @return Result<List<TeachingTask>>
     */
    @GetMapping("/teacher/{teacherId}")
    public Result<List<TeachingTask>> teacherHistory(@PathVariable String teacherId) {
        return Result.ok(teachingService.teacherHistory(teacherId));
    }
}
