/*
 * 健澜科技 jlmedaios - 教学培训 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.teaching.service;

import com.jlmedaios.monolith.teaching.entity.TeachingPlan;
import com.jlmedaios.monolith.teaching.entity.TeachingRecord;
import com.jlmedaios.monolith.teaching.entity.TeachingTask;
import com.jlmedaios.monolith.teaching.repository.TeachingPlanRepository;
import com.jlmedaios.monolith.teaching.repository.TeachingRecordRepository;
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
 * <p>append-only: 教学任务/记录不可修改</p>
 */
@Service
@RequiredArgsConstructor
public class TeachingService {

    private final TeachingTaskRepository teachingTaskRepository;
    private final TeachingPlanRepository teachingPlanRepository;
    private final TeachingRecordRepository teachingRecordRepository;

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

    /**
     * 创建教学计划。
     *
     * @param planTitle     计划标题
     * @param traineeType   学员类型
     * @param department    科室
     * @param startDate     开始日期
     * @param endDate       结束日期
     * @param supervisorId  导师工号
     * @return 已持久化的教学计划
     */
    public TeachingPlan createPlan(String planTitle, String traineeType, String department,
                                    LocalDate startDate, LocalDate endDate, String supervisorId) {
        TeachingPlan plan = TeachingPlan.builder()
                .planTitle(planTitle)
                .traineeType(traineeType)
                .department(department)
                .startDate(startDate)
                .endDate(endDate)
                .supervisorId(supervisorId)
                .build();
        return teachingPlanRepository.save(plan);
    }

    /**
     * 添加教学记录。
     *
     * @param planId           计划 ID
     * @param traineeName      学员姓名
     * @param courseName       课程名称
     * @param courseDate       课程日期
     * @param courseContent    课程内容
     * @param evaluationScore  评分
     * @return 已持久化的教学记录
     */
    public TeachingRecord addRecord(Long planId, String traineeName, String courseName,
                                     LocalDate courseDate, String courseContent,
                                     BigDecimal evaluationScore) {
        TeachingRecord record = TeachingRecord.builder()
                .planId(planId)
                .traineeName(traineeName)
                .courseName(courseName)
                .courseDate(courseDate)
                .courseContent(courseContent)
                .evaluationScore(evaluationScore)
                .build();
        return teachingRecordRepository.save(record);
    }

    /**
     * 学员培训记录。
     *
     * @param traineeName 学员姓名
     * @return 教学记录列表
     */
    public List<TeachingRecord> traineeRecords(String traineeName) {
        return teachingRecordRepository.findByTraineeName(traineeName);
    }
}
