/*
 * 健澜科技 jlmedaios - 教学培训 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.teaching.service;

import com.jlmedaios.monolith.teaching.entity.TeachingTask;
import com.jlmedaios.monolith.teaching.repository.TeachingTaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 教学培训 Service。
 *
 * <p>append-only: 教学任务记录不可修改</p>
 */
@Service
@RequiredArgsConstructor
public class TeachingService {

    private final TeachingTaskRepository teachingTaskRepository;

    /**
     * 创建教学任务。
     *
     * @param taskType       任务类型
     * @param topic          主题
     * @param teacherId      教师工号
     * @param deptCode       科室编码
     * @param date           日期
     * @param durationHours  时长（小时）
     * @param studentCount   学生人数
     * @return 已持久化的教学任务
     */
    public TeachingTask create(String taskType, String topic, String teacherId,
                               String deptCode, LocalDate date, BigDecimal durationHours,
                               Integer studentCount) {
        TeachingTask task = TeachingTask.builder()
                .taskType(taskType)
                .topic(topic)
                .teacherId(teacherId)
                .deptCode(deptCode)
                .date(date)
                .durationHours(durationHours)
                .studentCount(studentCount)
                .build();
        return teachingTaskRepository.save(task);
    }

    /**
     * 科室月度教学统计（mock）。
     *
     * @param deptCode 科室编码
     * @param year     年份
     * @param month    月份
     * @return 统计数据
     */
    public Map<String, Object> deptMonthStats(String deptCode, int year, int month) {
        Map<String, Object> stats = new HashMap<>();
        stats.put("total_tasks", 8);
        stats.put("total_hours", 12);
        return stats;
    }

    /**
     * 教师教学历史。
     *
     * @param teacherId 教师工号
     * @return 教学任务列表
     */
    public List<TeachingTask> teacherHistory(String teacherId) {
        return teachingTaskRepository.findByTeacherId(teacherId);
    }
}
