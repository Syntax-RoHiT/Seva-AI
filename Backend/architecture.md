# SEVA AI: Workflow & Heatmap System Document

This document details the end-to-end operational flow, team responsibilities, and the real-time urgency logic governing the SEVA AI platform.

---

## Section 1: End-to-End Workflow Flowchart
This section traces a single community report from submission to resolution and system learning. Each step is color-coded by system layer. The entire cycle targets **under 4 minutes** for critical (red zone) needs.

| Step | Action | Technology/Platform | System Layer |
| :--- | :--- | :--- | :--- |
| **1** | **Report Submitted** | Voice note (Hindi), Photo of paper form, Google Form, or SMS/WhatsApp | **INPUT** |
| **2** | **Language Normalization** | Google Translate API (Supports 22 Indian languages) | **TRANSLATE** |
| **3** | **AI Parsing** | Gemini 1.5 Pro (Extracts location, need, severity, and count) | **AI NLP** |
| **4** | **Auto-Trigger** | Cloud Function fires via Pub/Sub on Firestore detection | **BACKEND** |
| **5** | **Urgency Scoring** | Urgency Decay Engine (Algorithm 1) | **ALGORITHM 1** |
| **-** | **Decision Point** | **Is Urgency Score >= 7.0?**<br>YES: Immediate team assembly<br>NO: Added to priority queue | **DECISION** |
| **6** | **Team Slot Definition** | Swarm Assembler (Reads Gemini skill recommendations) | **ALGORITHM 3** |
| **7** | **Optimal Matching** | Hungarian Algorithm (Skills, Proximity, Availability) | **ALGORITHM 2** |
| **8** | **Load Balancing** | Conflict Resolution & Resource Gap Flagging | **BACKEND** |
| **9** | **Team Notifications** | FCM Push, Gmail API, and WhatsApp via Dialogflow CX | **NOTIFY** |
| **10** | **Live Tracking** | Volunteer GPS via Flutter & Google Maps SDK | **MAPS** |
| **11** | **System Learning** | Data piped to BigQuery; ML models updated | **LEARNING** |

---

## Section 2: Swimlane Diagram by Role
Tasks sit in the cell belonging to the team that owns them across the 5 build phases.

| PHASE | AI / NLP | Backend | Maps / GIS | Frontend | Notify |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Phase 1** (0–8h) | Gemini NLP parser; Hindi parsing test | Firebase project init; Firestore schema; Auth | Google Maps base config; Zone boundaries | React app scaffold; Firebase Hosting | — |
| **Phase 2** (8–20h) | Refine Gemini prompt; Edge case testing | Urgency Decay Engine; Hungarian Matcher | Distance Matrix integration; Proximity module | Connect Firestore to UI | — |
| **Phase 3** (20–32h) | Vision OCR & Voice endpoints | Resource gap logic; Conflict resolver | Live heatmap urgency overlay; Zone scoring | Volunteer PWA; Maps directions | FCM push setup |
| **Phase 4** (32–42h) | BigQuery ML forecaster | BigQuery pipeline; Looker Studio reports | Forecast zone pre-positioning map | Government dashboard; Admin UI | Gmail API; WhatsApp bot |
| **Phase 5** (42–48h) | Demo data; NLP stress test | End-to-end pipeline test; Security hardening | Demo map with sample zones | UI polish; Accessibility audit | Mobile responsiveness; Dry run |

---

## Section 3: Live Heatmap & Red Zone System
The heatmap is a living decision engine and the central command view for NGO admins.

### 3.1 Zone Color Legend
Scores are calculated by the Urgency Decay Engine and update automatically.

| Color | Score | Status | System Action |
| :--- | :--- | :--- | :--- |
| **RED** | 8.0 – 10+ | **CRITICAL** | Immediate team assembly; Admin alert; Notification < 60s. |
| **ORANGE** | 6.0 – 7.9 | **HIGH** | Auto-queue for matching; Reassessed every 30 mins. |
| **AMBER** | 4.0 – 5.9 | **MODERATE** | Added to priority board; Reassessed every hour. |
| **GREEN** | 2.0 – 3.9 | **LOW** | Logged and monitored; Flagged for daily review. |
| **BLUE** | 0 – 1.9 | **RESOLVED** | Heatmap cleared; Data archived to BigQuery. |

### 3.2 Urgency Score Formula
The formula used to determine priority is:
**U = S × (1 + T / 12) × Z + R + W**

* **S (Base Severity):** 1–5 rating from field workers.
* **T (Hours Unresolved):** Multiplier doubles every 12 hours.
* **Z (Zone Density):** Rural (1.0), Urban (1.5), Slum (2.0).
* **R (Repeat Report):** +1.0 for each duplicate report (crowd-sourced signal).
* **W (Weather Risk):** +0.5 to +1.5 based on flood, heat, or rain risks.

### 3.3 Forecast Zones (Predicted Needs)
* **Dashed Border:** Prediction based on historical patterns (48–72 hours out).
* **Pulsing Amber:** Moderate confidence (60–79%) based on weather risk.
* **Pulsing Red:** High confidence (80%+). Volunteers are pre-assigned.

---

**KEY TAKEAWAY:**
The heatmap IS the urgency algorithm made visible. It is a living decision engine where colors change and zones escalate without human input to ensure no critical need is ignored.

**SEVA AI — Smart Resource Allocation for Social Impact — Built to Win.**