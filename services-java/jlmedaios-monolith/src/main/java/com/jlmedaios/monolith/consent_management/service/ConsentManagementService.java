/*
 * 健澜科技 jlmedaios - 知情同意管理 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.consent_management.service;

import com.jlmedaios.monolith.consent_management.entity.ConsentForm;
import com.jlmedaios.monolith.consent_management.repository.ConsentFormRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * 知情同意管理 Service。
 *
 * <p>append-only: 知情同意书不可修改；对接电子签名模块，病历 append-only</p>
 */
@Service
@RequiredArgsConstructor
public class ConsentManagementService {

    private final ConsentFormRepository consentFormRepository;

    /**
     * 创建知情同意书。
     *
     * @param formNo    表单编号
     * @param patientId   患者 ID
     * @param formType    表单类型
     * @param content     内容
     * @return 已持久化的知情同意书
     */
    public ConsentForm createForm(String formNo, String patientId, String formType, String content) {
        ConsentForm form = ConsentForm.builder()
                .formNo(formNo)
                .patientId(patientId)
                .formType(formType)
                .content(content)
                .build();
        return consentFormRepository.save(form);
    }

    /**
     * 签署（status=SIGNED + signTime）。
     *
     * @param formId             表单 ID
     * @param patientSignature    患者签名
     * @param doctorSignature     医生签名
     * @return 已更新的知情同意书
     */
    public Optional<ConsentForm> sign(Long formId, String patientSignature, String doctorSignature) {
        Optional<ConsentForm> opt = consentFormRepository.findById(formId);
        if (opt.isPresent()) {
            ConsentForm form = opt.get();
            form.setStatus("SIGNED");
            form.setSignTime(LocalDateTime.now());
            form.setPatientSignature(patientSignature);
            form.setDoctorSignature(doctorSignature);
            consentFormRepository.save(form);
        }
        return opt;
    }

    /**
     * 患者已签同意书列表。
     *
     * @param patientId 患者 ID
     * @return 知情同意书列表
     */
    public List<ConsentForm> patientForms(Long patientId) {
        return consentFormRepository.findByPatientId(String.valueOf(patientId));
    }
}
