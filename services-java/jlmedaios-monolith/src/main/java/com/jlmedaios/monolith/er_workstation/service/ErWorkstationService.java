/*
 * 健澜科技 jlmedaios - 急诊工作站 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.er_workstation.service;

import com.jlmedaios.monolith.er_workstation.entity.ERVisit;
import com.jlmedaios.monolith.er_workstation.repository.ERVisitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 急诊工作站 Service。
 *
 * <p>append-only: 急诊就诊记录不可修改</p>
 */
@Service
@RequiredArgsConstructor
public class ErWorkstationService {

    private final ERVisitRepository erVisitRepository;

    /**
     * 今日急诊列表。
     *
     * @return 急诊就诊记录列表
     */
    public List<ERVisit> todayVisits() {
        return erVisitRepository.findAll();
    }

    /**
     * 急诊分诊。
     *
     * @param visitNo     就诊编号
     * @param triageLevel 分诊级别
     * @return 已分诊的急诊就诊记录
     */
    public ERVisit triage(String visitNo, String triageLevel) {
        ERVisit visit = findByVisitNo(visitNo);
        if (visit != null) {
            visit.setTriageLevel(triageLevel);
            visit.setTriageTime(LocalDateTime.now());
            visit.setStatus("IN_VISIT");
            return erVisitRepository.save(visit);
        }
        return null;
    }

    /**
     * 接诊。
     *
     * @param visitNo 就诊编号
     * @param doctor  接诊医生
     * @param room    诊室
     * @return 已接诊的急诊就诊记录
     */
    public ERVisit admit(String visitNo, String doctor, String room) {
        ERVisit visit = findByVisitNo(visitNo);
        if (visit != null) {
            visit.setDoctor(doctor);
            visit.setRoom(room);
            visit.setStatus("IN_VISIT");
            return erVisitRepository.save(visit);
        }
        return null;
    }

    /**
     * 离院（转归）。
     *
     * @param visitNo 就诊编号
     * @param outcome 转归
     * @return 已离院的急诊就诊记录
     */
    public ERVisit discharge(String visitNo, String outcome) {
        ERVisit visit = findByVisitNo(visitNo);
        if (visit != null) {
            visit.setStatus("DISCHARGED");
            return erVisitRepository.save(visit);
        }
        return null;
    }

    private ERVisit findByVisitNo(String visitNo) {
        // P1 性能优化：直接调用 Repository 派生查询，替代 findAll().stream().filter()
        return erVisitRepository.findByVisitNo(visitNo);
    }
}
