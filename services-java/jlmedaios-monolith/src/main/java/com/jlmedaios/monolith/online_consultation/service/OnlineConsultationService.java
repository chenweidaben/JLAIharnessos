/*
 * 健澜科技 jlmedaios - 在线咨询 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.online_consultation.service;

import com.jlmedaios.monolith.online_consultation.entity.OnlineConsultation;
import com.jlmedaios.monolith.online_consultation.repository.OnlineConsultationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * 在线咨询 Service。
 *
 * <p>append-only: 在线咨询记录不可修改</p>
 */
@Service
@RequiredArgsConstructor
public class OnlineConsultationService {

    private final OnlineConsultationRepository onlineConsultationRepository;

    /**
     * 创建在线咨询。
     *
     * @param consultationNo     咨询编号
     * @param patientId          患者 ID
     * @param departmentCode     科室编码
     * @param symptomDescription 症状描述
     * @param fee               咨询费
     * @return 已持久化的咨询
     */
    public OnlineConsultation create(String consultationNo, String patientId,
                                      String departmentCode, String symptomDescription,
                                      BigDecimal fee) {
        OnlineConsultation consultation = OnlineConsultation.builder()
                .consultationNo(consultationNo)
                .patientId(patientId)
                .departmentCode(departmentCode)
                .symptomDescription(symptomDescription)
                .fee(fee)
                .build();
        return onlineConsultationRepository.save(consultation);
    }

    /**
     * 医生接诊（设 status=IN_PROGRESS）。
     *
     * @param id       咨询 ID
     * @param doctorId 医生工号
     * @return 已更新的咨询
     */
    public Optional<OnlineConsultation> accept(Long id, String doctorId) {
        Optional<OnlineConsultation> opt = onlineConsultationRepository.findById(id);
        if (opt.isPresent()) {
            OnlineConsultation consultation = opt.get();
            consultation.setStatus("IN_PROGRESS");
            consultation.setDoctorId(doctorId);
            onlineConsultationRepository.save(consultation);
        }
        return opt;
    }

    /**
     * 结束咨询（设 status=COMPLETED）。
     *
     * @param id                 咨询 ID
     * @param prescriptionGenerated 是否生成处方
     * @return 已更新的咨询
     */
    public Optional<OnlineConsultation> finish(Long id, Boolean prescriptionGenerated) {
        Optional<OnlineConsultation> opt = onlineConsultationRepository.findById(id);
        if (opt.isPresent()) {
            OnlineConsultation consultation = opt.get();
            consultation.setStatus("COMPLETED");
            consultation.setPrescriptionGenerated(prescriptionGenerated);
            onlineConsultationRepository.save(consultation);
        }
        return opt;
    }

    /**
     * 待接诊列表（status=PENDING）。
     *
     * @return 咨询列表
     */
    public List<OnlineConsultation> pendingList() {
        return onlineConsultationRepository.findByStatus("PENDING");
    }
}
