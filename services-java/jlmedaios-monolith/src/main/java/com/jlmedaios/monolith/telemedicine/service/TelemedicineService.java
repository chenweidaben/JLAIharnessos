/*
 * 健澜科技 jlmedaios - 远程医疗 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.telemedicine.service;

import com.jlmedaios.monolith.telemedicine.entity.TelemedicineVisit;
import com.jlmedaios.monolith.telemedicine.repository.TelemedicineVisitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * 远程医疗 Service。
 *
 * <p>append-only: 远程问诊记录不可修改</p>
 */
@Service
@RequiredArgsConstructor
public class TelemedicineService {

    private final TelemedicineVisitRepository telemedicineVisitRepository;

    /**
     * 创建远程问诊。
     *
     * @param visitNo    问诊编号
     * @param patientId    患者 ID
     * @param doctorId     医生 ID
     * @param department   科室
     * @param visitType    问诊类型
     * @return 已持久化的远程问诊
     */
    public TelemedicineVisit createVisit(String visitNo, String patientId, String doctorId,
                                          String department, String visitType) {
        TelemedicineVisit visit = TelemedicineVisit.builder()
                .visitNo(visitNo)
                .patientId(patientId)
                .doctorId(doctorId)
                .department(department)
                .visitType(visitType)
                .build();
        return telemedicineVisitRepository.save(visit);
    }

    /**
     * 开始问诊（status=IN_PROGRESS）。
     *
     * @param visitId 问诊 ID
     * @return 已更新的远程问诊
     */
    public Optional<TelemedicineVisit> startVisit(Long visitId) {
        Optional<TelemedicineVisit> opt = telemedicineVisitRepository.findById(visitId);
        if (opt.isPresent()) {
            TelemedicineVisit visit = opt.get();
            visit.setStatus("IN_PROGRESS");
            telemedicineVisitRepository.save(visit);
        }
        return opt;
    }

    /**
     * 结束问诊（status=ENDED + durationMinutes + prescriptionIssued）。
     *
     * @param visitId             问诊 ID
     * @param durationMinutes      问诊时长
     * @param prescriptionIssued   是否开处方
     * @return 已更新的远程问诊
     */
    public Optional<TelemedicineVisit> endVisit(Long visitId, Integer durationMinutes,
                                                 Boolean prescriptionIssued) {
        Optional<TelemedicineVisit> opt = telemedicineVisitRepository.findById(visitId);
        if (opt.isPresent()) {
            TelemedicineVisit visit = opt.get();
            visit.setStatus("ENDED");
            visit.setDurationMinutes(durationMinutes);
            visit.setPrescriptionIssued(prescriptionIssued);
            telemedicineVisitRepository.save(visit);
        }
        return opt;
    }

    /**
     * 待接诊列表。
     *
     * @return 远程问诊列表
     */
    public List<TelemedicineVisit> pendingList() {
        return telemedicineVisitRepository.findByStatus("WAITING");
    }
}
