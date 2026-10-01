# Internet Hospital Integrated Platform — Top-Level Architecture Design (English)

> Hangzhou Jianlan Technology · jlmedaios Industrial-Grade Agent Operating System for Digital Hospitals
> In-hospital / out-of-hospital & online / offline integration · WeChat Mini Program patient end · Aligned to National Smart Service Level 3
> Version v1.0 (Design Draft)　Date: 2026-09-30
> Copyright (c) 2026 Hangzhou Jianlan Technology Co., Ltd.

---

## 1. Background and Goals

### 1.1 Background

Within the hospital, jlmedaios has closed the loops of outpatient, inpatient, orders & prescriptions, medical documentation, billing, pharmacy, diagnostics, surgery & anesthesia, archive, and appointment & follow-up (M0–M3-I). This platform extends **beyond the hospital (the Internet)** to build an integrated service model of "**one physical hospital + one internet hospital + multiple patient entry points**".

Policy and compliance basis:

- Notice on Issuing the *Hospital Smart Service Grading Evaluation Standard System (Trial)* (NHC Office Letter [2019] No. 236, the 4S system);
- *Internet Hospital Management Measures (Trial)*, *Internet Diagnosis & Treatment Management Measures (Trial)*, *Telemedicine Service Management Specification (Trial)* (NHC Medical [2018] No. 25);
- *Internet Diagnosis & Treatment Supervision Rules (Trial)* (NHC Office Medical [2022] No. 2);
- Provincial/municipal internet hospital management measures and provincial internet medical service supervision platform integration standards;
- Cybersecurity Classified Protection 2.0 (**Level 3** for core internet hospital systems), the *Data Security Law*, and the *Personal Information Protection Law*.

### 1.2 Goals

1. **Grade**: Achieve **National Smart Service Level 3** ("preliminary smart services connecting inside and outside the hospital"), with a path reserved for Level 4.
2. **Integrate**: Medical records, prescriptions, billing, and follow-up generated online share real-time interconnection with in-hospital EMR/HIS, unified master index, unified signatures and audit — no "two disconnected skins".
3. **Production-ready**: Designed for large tertiary hospitals (multiple campuses, tens of thousands of daily visits, millions of registered users, thousands of peak concurrent users), 7×24, with elastic scaling and canary release.
4. **Compliant**: Full traceability; proactive integration with the provincial supervision platform, medical insurance platform, and e-prescription circulation platform; AI assists only; physicians and pharmacists sign in person.
5. **Convenient**: WeChat Mini Program as the primary entry covering appointment, consultation, prescription, payment, delivery, reports, inpatient, follow-up, and satisfaction, with age-friendly and digital escort.

---

## 2. Technology Selection

### 2.1 Decision

| Layer | Selection | Notes |
|---|---|---|
| Internet hospital backend (business/BFF/gateway) | **TypeScript + Bun** (same stack as jlmedaios) | Reuse all in-hospital domain capabilities; unified type contracts |
| Patient end | **WeChat Mini Program (native WXML/WXSS, componentized)**, with **Taro cross-platform** evaluated (WeChat/Alipay/H5/APP) | Prioritize the WeChat ecosystem; cross-platform reuse |
| Physician/pharmacist online workstation | Reuse the existing **React 19 + Vite + Ant Design 5** web end, adding online consultation/video modules | No duplicate build; unified workstation |
| Audio/video consultation | Third-party **real-time RTC SDK** (Tencent TRTC / Alibaba ART C / Agora, pluggable) + text/image IM | Self-built WebRTC is not medical-grade; use licensed vendors |
| Database | PostgreSQL 16 (shared or separate instance + CDC sync) | Strong consistency, JSONB, partitioning, RLS |
| Cache/session/lock | Redis (sessions, verification codes, appointment slots, rate limiting, distributed locks) | Stateless prerequisite |
| Messaging/events | Kafka (or RedPanda): IM messages, business events, peak shaving, supervision reporting | Async decoupling |
| External integration | **Gateway isolation layer**: supervision, insurance, payment, prescription circulation gateways | Business systems never connect directly |
| Heterogeneous service integration | Standard REST/gRPC + FHIR; **Java/Spring Boot and other heterogeneous services allowed** | Meets Java requirements in tenders without rewriting the core |

### 2.2 Why TypeScript/Bun rather than an all-Java rewrite

1. **Maximum reuse**: The internet hospital is not isolated; ~70% of capabilities (records, orders, prescriptions, billing, drugs, follow-up, QC, signatures, audit, permissions) are already implemented in TypeScript and tested. A Java rewrite means rewriting and maintaining two stacks long-term — high cost and risk.
2. **Consistent contracts**: Bun/TypeScript shares types with the frontend for end-to-end type safety; Bun has fast startup, high throughput, native fetch/TS/testing.
3. **No language barrier to cloud-native**: Containerization, K8s, service mesh, observability, and Level 3 protection are language-independent; TypeScript services scale horizontally.
4. **Java needs met via open architecture**: Tenders often list Java, but the essential requirement is "mature, maintainable, integrable, available talent". The platform allows Java heterogeneous services (e.g., an existing Java insurance front-end) via standard APIs/FHIR/gRPC, with full documentation; it does **not** do an all-Java rewrite for its own sake.
5. **AI-native advantage**: TypeScript naturally fits AI agents/tool calls, structured output (JSON Schema), and streaming, enabling smart triage, pre-consultation, and AI assistance online and offline.

> If a specific hospital mandates an "all-Java domestic (Xinchuang) stack", it can be met at delivery via an **adapter layer + heterogeneous services**, with the core engine unchanged; this boundary is stated in the technical proposal and does not affect the open-source mainline.

---

## 3. Overall Architecture

### 3.1 Position in the jlmedaios six-layer architecture

The internet hospital is a **patient-facing "second access domain + patient service domain"**, reusing in-hospital middle platforms horizontally and connecting to external platforms via isolated gateways vertically:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Patient access      WeChat Mini Program (primary) · Official Account · H5 · Alipay (opt) · APP (opt)
│ Clinician access    Existing web workstation (adding online consultation/video/audit modules) · mobile (opt)
├──────────────────────────────────────────────────────────────────────────┤
│ Internet hospital BFF / API gateway (separate deployment, DMZ, WAF, rate limit, auth, canary)
│  Patient orchestration: real-name/patients · appointments · online consultation · e-prescriptions
│                        · online payment · drug delivery · reports · inpatient · follow-up · satisfaction
│                        · smart triage / pre-consultation / digital escort
├──────────────────────────────────────────────────────────────────────────┤
│ External integration gateways (isolation, pluggable, replayable, degradable)
│  Supervision · Insurance · Payment (WeChat/Alipay) · Prescription circulation · Logistics
│  · Real-name · E-invoice · RTC/IM · Push (subscription messages/SMS) · E-signature/CA
├──────────────────────────────────────────────────────────────────────────┤
│ Reuse jlmedaios in-hospital core (HIS+EMR integrated microservices)
│  Outpatient · Inpatient · Orders/Rx · Documentation · Billing · Pharmacy · Diagnostics
│  · Surgery/Anesthesia · Archive · Scheduling/Follow-up · AI middle platform
├──────────────────────────────────────────────────────────────────────────┤
│ Data platform: PostgreSQL (RLS) · EMPI · Redis · Kafka · Lakehouse · disease/follow-up · supervision DB
└──────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Network Zones (production)

- **Public zone (DMZ)**: WAF, anti-DDoS, load balancer, internet hospital BFF, static resources.
- **External integration zone**: gateway adapters for supervision/insurance/payment/prescription/logistics/real-name; unified egress, whitelist, TLS.
- **In-hospital core zone**: HIS/EMR/database (not exposed to the public), accessed via BFF/gateways.
- **Management zone**: operations management, O&M, audit, bastion host.
- Zones are isolated by firewalls + NetworkPolicy; cross-zone traffic always uses TLS + authentication.

---

## 4. Patient End (WeChat Mini Program)

### 4.1 Module Overview

| Group | Module | Key Capabilities |
|---|---|---|
| Account | Real-name registration/login | WeChat authorized login, phone, ID card OCR, face liveness, electronic health card / insurance electronic certificate, patient management (self/elderly/child, up to 5) |
| Pre-visit | Smart triage | Symptom dialogue (text/voice) → recommend department/doctor; AI pre-consultation collects history and generates a report |
| Pre-visit | Appointment | Department/doctor/slot query, time-based appointment, real-time slot sync, payment, cancellation/reschedule, no-show blacklist |
| During visit | Online consultation | Text/voice/video calls; follow-up only (must have a clearly diagnosed historical visit); messages (text/image/voice); physician reception |
| During visit | E-prescription | Online prescribing (follow-up only, no AI auto-generation), pharmacist review, details, contraindication/interaction alerts, circulation |
| During visit | Online payment | Online insurance pooling + personal account + self-pay (WeChat/Alipay), mobile payment, refund, e-invoice (verify/download) |
| During visit | Drug acquisition | In-hospital pickup (code/navigation), external prescription to designated pharmacies, home delivery (address/freight/tracking) |
| Post-visit | Report query | Lab/imaging reports, cloud film, historical comparison, report interpretation (AI-assisted + physician review) |
| Inpatient | Inpatient services | Admission appointment, registration, deposit top-up, daily bills, surgery progress, discharge settlement, bedside settlement |
| Post-visit | Health management | Follow-up plans/records, chronic disease management, medication reminders, family doctor signing, health records, wearables (opt) |
| End-to-end | Satisfaction | Itemized ratings for appointment/consultation/billing/pharmacy/examination, complaints, service supervision |
| Age-friendly | Digital escort | Large fonts, voice interaction, digital-human full-process guidance, family agency with authorization |
| Content | Health education | Science popularization, visit guides, suspension notices, personalized push |

### 4.2 Patient and Real-Name Authentication (compliance key)

- **Real-name system**: Patients must provide true identity; impersonation is prohibited. Minors/those unable to express themselves must be accompanied by a guardian whose information is also registered.
- Authentication levels: L1 WeChat authorization (phone) → L2 ID OCR + face liveness (strong real-name) → L3 insurance electronic certificate / health card.
- **Online follow-up, prescribing, and insurance payment require L2+**; prescribing for children under 6 requires confirming a guardian and a professional physician.
- Real-name authentication is completed via a **third-party real-name gateway** (public security/operator/bank four-element); sensitive data is minimized, encrypted, and raw images are not retained.
- Connected with in-hospital EMPI: online account ↔ EMPI ↔ patient; one person, one file across endpoints.

---

## 5. Physician, Pharmacist, and Administration Ends

### 5.1 Physician End (online consultation)

- **Scheduling and activation**: credential review (license/title/scope/years), online scheduling, slot/consultation limits, suspension/replacement.
- **Consultation workstation**: queues for to-receive/in-consultation/finished; text IM, voice, video calls; view patient history online and offline, reports, diagnoses, medications.
- **Online care**: fill follow-up records (AI pre-consultation/voice records assist; physician edits and signs), state diagnoses, order lab/imaging, prescribe (personal e-signature/CA).
- **Compliance**: follow-up, common diseases, chronic diseases only; no first-visit diagnosis; no narcotics/psychotropics; no AI auto-prescribing; response time limits (e.g., within 24 hours).
- **Patient management and follow-up**: groups, tags, follow-up plans, return reminders, statistics.

### 5.2 Pharmacist End (online review)

- Prescription review queue; online/offline review; multi-point checks, interactions, contraindications, dosage, duplicate medication, indication review;
- Approve/return (reason required); **a prescription takes effect only after a pharmacist approves**; medication guidance;
- Prescription circulation and dispensing, drug returns; review statistics and quality traceability.

### 5.3 Administration End (operations/supervision)

- Organization and personnel credentials, departments/roles/permissions;
- Operations: appointment/consultation/prescription/payment/delivery/refund rates, revenue, performance, reports;
- Content management: education, home pages, push, message templates;
- Supervision integration: reporting monitoring, re-reporting, anomaly alerts;
- QC and risk control: complaints, service supervision, violation alerts, audit queries, blacklists;
- Reconciliation: payment/insurance/invoice/logistics reconciliation, error handling.

---

## 6. External Integration Gateways (Isolation Layer)

> Core principle: **business systems never connect directly to external platforms**; all go through a gateway isolation layer for protocol adaptation, multi-region switching, rate limiting, replay, degradation, and audit.

| Gateway | Counterparty | Key Capabilities |
|---|---|---|
| Supervision | Provincial internet medical supervision platform | Full-process real-time/near-real-time reporting of organization/personnel/credentials, consultation, prescriptions, review, billing, complaints; provincial protocols; re-reporting on failure |
| Insurance | Medical insurance platform (mobile payment/personal account/pooling/certificate) | Insurance middle-platform isolation; payment/cancellation/refund, reconciliation, certificate authorization; multi-city switching |
| Payment | WeChat Pay, Alipay, aggregate payment | Unified order, callback signature verification, refund, statements, idempotency |
| Prescription circulation | E-prescription circulation platform / designated pharmacies | Upload, review, dispensing, status return, traceability |
| Logistics | Third-party delivery (SF/JD/Meituan) | Order, waybill, tracking, receipt, freight, exceptions |
| Real-name | Public security/operator/bank/WeChat/Alipay | ID verification, face liveness, four-element, health/insurance cards |
| RTC/IM | RTC vendors (TRTC/ARTC/Agora) | Rooms/tokens, calls, recording (compliance), weak network, encryption |
| Push | WeChat subscription messages/official account/SMS | Templates, delivery receipts, opt-out |
| E-signature/CA | Third-party CA | Reliable physician/pharmacist e-signature, timestamp, verification, certificate management |
| E-invoice | Fiscal e-invoice | Issue, verify, download, red-ink reversal |

---

## 7. Core Business Processes

### 7.1 Follow-up + E-prescription + Insurance Payment + Delivery (main chain)

```
Patient: real-name login → select patient → smart triage/select department & doctor → initiate follow-up
  (check: follow-up eligibility = historical visit with the same diagnosis; L2 authentication)
Physician: receive → text/video consultation → view history → fill follow-up record
           (AI-assisted, personal signature) → state diagnosis → order tests / prescribe (personal e-signature)
Pharmacist: receive prescription → online review → approve/return (reason)
System: prescription takes effect → fee aggregation → patient chooses acquisition method
Payment: insurance gateway (pooling + personal account) / self-pay → success → e-invoice
Acquisition: pickup (code/navigation) / external pharmacy / home delivery (tracking)
Post-visit: follow-up plan (auto-generated) → record → satisfaction
End-to-end: real-time supervision reporting; hash-chain audit
```

### 7.2 State Machines (key domains)

- **Consultation session**: `to-receive → in-consultation → awaiting pharmacist review (prescribed) → awaiting payment → awaiting pickup/delivery → completed`; exceptions: `cancelled / appointment cancelled / refunded / returned (rectification)`.
- **E-prescription**: `to-review → approved (effective) / returned → paid → dispensed/delivered → completed`; `voided/returned`.
- **Payment**: `to-pay → paying → paid → invoiced`; `failed/refunded (red-ink)`.
- All transitions use **whitelists + optimistic locking (version) + row locks (FOR UPDATE)**, ensuring no duplicates and idempotency under concurrency.

### 7.3 Exceptions and Compensation (Saga)

- Payment success but dispensing/delivery failure: trigger compensation (retry/change pharmacy/auto-refund + red-ink invoice);
- Insurance settlement failure: roll back personal/self-pay, release the prescription;
- Supervision reporting failure: enter a retry queue; it does not block the main flow but raises alerts;
- Each step records a Saga log (direction/status/time), supporting manual intervention and reconciliation.

---

## 8. Data Architecture and Security

### 8.1 Data Organization

- **Shared vs. separate strategy**: Initially, in-hospital/internet may share an **instance with different schemas + row-level security (RLS)**; at scale, use a **separate internet instance + CDC (Kafka) sync**, ensuring eventual consistency and fault isolation.
- EMPI unifies the patient master index, mapping online accounts, patients, in-hospital files, and insurance/health cards.
- Internet-side core tables: patient accounts, patients, consultation sessions, IM messages, online prescriptions, payment orders, delivery orders, follow-up, satisfaction, supervision reports, real-name records, audio/video record indexes.
- Messages and recordings: IM messages and audio/video recordings (compliance) are stored for a defined retention period, encrypted and access-controlled.

### 8.2 Security and Privacy (Level 3 protection)

- **Identity and authorization**: MFA, strong JWT signatures, RBAC + ABAC + data scope (self/patient/department/campus); least privilege, separation of duties (prescribing/review/billing).
- **Data protection**: TLS 1.2+ in transit, AES-256-GCM at rest, field-level encryption (ID/face/phone), **default masking** (name/phone/ID in display), tiered key management (KMS).
- **Application security**: WAF, SQL/XSS/command injection, parameterization, IM/mini-program content security (text/image moderation, sensitive words), anti-abuse/crawl, human verification, API signing and anti-replay.
- **Audit**: Hash-chain tamper-evident audit, full traces of login/operation/data access; audit independent of business accounts.
- **Compliance**: Minimum necessary personal information, informed consent, privacy policy, data export control, minor protection, deletion/withdrawal.
- **High availability**: Multi-AZ, multiple replicas, automatic failover, off-site backup and recovery drills, RTO/RPO targets (e.g., RTO≤30min, RPO≤5min).

### 8.3 AI Boundary (not to be crossed)

- Smart triage, pre-consultation, digital escort, report interpretation, and record/prescription **assistance** are suggestions; **all diagnoses, prescriptions, record signatures, and review conclusions are confirmed and e-signed by physicians/pharmacists in person**;
- **AI auto-prescription and dispensing before prescribing are strictly prohibited**; AI outputs must mark sources and uncertainty, and key suggestions are traceable.

---

## 9. National Smart Service Level 3 Mapping

Level 3 requires: **8 basic items all met (some application ratios ≥80%) + at least 4 of 9 optional items met (some ≥50%) + total score ≥30**.

| # | Category | Item | Platform Support | Basic/Optional |
|---|---|---|---|---|
| 1 | Pre-visit | Appointment | WeChat time-based appointment, slot sync, in-consultation/follow-up/medical-community appointment (M3-K) | Basic |
| 2 | Pre-visit | Emergency linkage | In-hospital emergency linkage built; online appointment/call (M3-F) | Optional |
| 3 | Pre-visit | Referral | Bidirectional referral orders, external document capture & storage, patient registration + visit creation on acceptance, medical-community coordination (M3-R) | Basic |
| 4 | During visit | Information push | Subscription messages: waiting/reports/critical values/surgery/admission-discharge/medication (M3-F) | Basic |
| 5 | During visit | Signage & navigation | Companion-guide step navigation; in-hospital indoor positioning/navigation per hospital (M3-Q) | Optional |
| 6 | During visit | Patient convenience | Online convenience, escort/catering/facilities (per hospital) | Optional |
| 7 | Post-visit | Patient feedback | Mini-program satisfaction/complaints, service supervision (M3-O) | Basic |
| 8 | Post-visit | Patient management (follow-up) | Follow-up plans/records, chronic disease management (M3-I) | Optional |
| 9 | Post-visit | Drug dispensing & delivery | Prescription lookup, drug leaflets, rational-use review, online delivery (M3-L/N) | Basic |
| 10 | Post-visit | Family services | Family doctor signing, online family services (per region) | Optional |
| 11 | End-to-end | Primary-care physician guidance | Remote teaching/consultation guidance, clinical decision support (per community) | Optional |
| 12 | End-to-end | Payment | Online insurance settlement + mobile payment + e-invoice (M3-M) | Basic |
| 13 | End-to-end | Smart triage | AI triage + pre-consultation (M3-P) | Basic |
| 14 | End-to-end | Health education | Medical knowledge lookup, health education content (per hospital) | Optional |
| 15 | End-to-end | Telemedicine | Text/video consultation, remote consultation (M3-K) | Basic |
| 16 | Infrastructure | Security management | Real-name/MFA/encryption/audit (M3-C); MLPS Level 3 per assessment | Optional |
| 17 | Infrastructure | Service supervision | Service supervision mechanism, records, complaint closure (M3-O) | Optional |

> Per Annex 3 of the official *Hospital Smart Service Grading Assessment Standard System (Trial)*, the **Level 3 basic items are 1, 3, 4, 7, 9, 12, 13, 15 (8 items)**, all genuinely delivered by this platform (see *05 Smart Service Level 3 Self-Assessment*); among the 9 optional items, 2, 5, 6, 8, 16, 17 are available or partially available, satisfying the "at least 4 optional items met (application ratio ≥50%)" requirement.

---

## 10. Milestone Plan (aligned with the roadmap)

| Milestone | Scope | Deliverable |
|---|---|---|
| **M3-J Internet hospital foundation** | Internet BFF/gateway skeleton, patient accounts/patients/real-name (L1/L2), EMPI binding, clinician credentials, deployment/security baseline | Backend + admin + mini-program skeleton |
| **M3-K Appointments + online consultation (text)** | Slot sync, time-based appointments, text IM, follow-up eligibility checks, session state machine | Mini-program + physician end |
| **M3-L E-prescription + online review** | Online prescribing, pharmacist review, circulation, prescription state machine | Mini-program + physician/pharmacist end |
| **M3-M Payment + insurance + e-invoice** | Insurance gateway, mobile payment, reconciliation, e-invoice, refund compensation | Mini-program + admin |
| **M3-N Drug delivery + reports/inpatient** | Logistics, pickup/external, reports/cloud film, inpatient deposit/bills/settlement | Mini-program |
| **M3-O Follow-up + satisfaction + smart triage/pre-consultation/digital escort** | Follow-up closure, ratings, AI triage/pre-consultation/escort, Level 3 self-assessment | All ends |
| Protection/supervision | Supervision platform integration, Level 3 evaluation, stress testing, disaster drills | Compliance delivery |

> Each milestone follows the jlmedaios definition of done: data truly persisted and retained after restart, end-to-end positive + exception loops, tsc 0, all tests green with coverage, unauthorized/data-scope verification, real evidence, **commit + dual-platform push + annotated tag + three-way verification** before being declared closed.

---

## 11. Deployment and Operations

- **Containerization**: Internet BFF, gateways, and services are built as fixed-version OCI images (non-root, minimal, SBOM).
- **Orchestration**: K8s (HPA, PDB, anti-affinity, NetworkPolicy, Ingress + TLS); Redis/PostgreSQL/Kafka as StatefulSet or managed.
- **Multiple environments**: dev/test/staging/prod separation, config center + secret management (KMS/Secret), GitOps + IaC.
- **Release**: Blue-green/canary, mini-program grayscale (by version/ratio), rollback plans.
- **Observability**: Unified logs (masked), metrics (Prometheus), tracing (OpenTelemetry), business dashboards (consultation/payment/fulfillment/supervision), alerting.
- **Disaster recovery**: Multi-AZ + off-site backup + regular recovery drills; peak stress testing (appointments/flash sales/report return).

---

## 12. Acceptance Criteria (production-ready)

1. Smart Service Level 3 reached (8 basic + ≥4 optional + score ≥30), demonstrable with evidence;
2. Supervision, insurance, payment, prescription circulation, logistics, real-name, CA, and e-invoice truly connected end-to-end (not mock);
3. Stress tests passed (response time, concurrency, availability), 7×24 stable, automatic failover and compensation;
4. Level 3 protection passed, data security and privacy compliant, complete audit;
5. Online/offline data consistent, signature chains complete, no false success, no silent degradation;
6. Complete documentation (architecture/API/deployment/operations/user, Chinese & English), images and orchestration "runnable on download".

---

> This design is the out-of-hospital extension of the jlmedaios top-level architecture, used together with *01 Top-Level Design*, *02 Strangler Roadmap*, and *03 Architecture Review*. Implementation proceeds slice by slice from M3-J — slow is smooth, smooth is fast, with evidence at every step.
