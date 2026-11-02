# IH-4 — Noise (NRA) & CHRA Report Generators

Two new modules sit alongside the CEM, with the same look and workflow. They are linked from the dashboard (`index.html`).

| Module | Page | Files |
|---|---|---|
| Noise Risk Assessment | `noise.html` | `noise-app.js`, `noise-sample.js` |
| Chemical Health Risk Assessment | `chra.html` | `chra-app.js`, `chra-sample.js` |
| Shared | – | `ih-common.js`, `ih-modules.css` |

Keep all files in the same folder as `index.html`. Data is saved in the browser (localStorage). Use **Backup JSON / Restore JSON** to move a report between devices.

## Noise (NRA) — OSH (Noise Exposure) Regulations 2019 / ICOP 2019
1. **📂 Load previous project** loads the PCM Klang Motor (Toyota Sg. Rasah) Review NRA, July 2026.
2. **Import "Datasheet & Calculation" Excel** (one file per day) reads the *Summary* and *Personal Form* sheets.
3. Calculated automatically:
   - LEX,8h = LeqTe + 10·log(Te/8)
   - Dose = 100·(Te/8)·10^((LeqTe−85)/10)
   - Exceedances: 82 / 85 dB(A), Max 115 dB(A), Peak 140 dB(C)
   - Colour zones
   - PHP attenuation: (NRR−7)/2, and NRR/2 for peak
   - Daily exposure duration limit: T = 8/2^((L−85)/3)
   - HCP triggers: training, audiometric testing, Hearing Protection Zone
4. The **QA panel** flags: calibration expired before the monitoring date, dosimeter missing from Table 3, SEG sample-count mismatch, short sampling duration, and insufficient PHP.
5. **Download Word** produces the full report (Executive Summary, 1.0–11.0, Tables 1–14) in the ESTV final-report structure.

## CHRA — USECHH Regulations 2000 / DOSH CHRA Manual 3rd Ed. (2018)
1. **📂 Load previous project** loads the PCM Klang Motor (Toyota Body & Paint Kapar) CHRA, 8 Sept 2026.
   - Panel Beating, Polisher and Car Wash are loaded in full from their Forms A–D.
   - Paint Mixer, Spray Painter, Reassembly and General Service Mechanic carry summary counts only. Import their *FORMS A TO D* Excel (Drive: CHRA REPORT / Forms A to D) to add the detail.
2. **Import "Forms A to D" Excel** (one workbook per work unit) reads Form A, B1, B2, C1, C2 and D1–D5.
3. Calculated automatically:
   - FDR = ⌈(FR+DR)/2⌉
   - ER = ⌈(FDR+MR)/2⌉
   - RR = HR×ER: Low 1–4, Moderate 5–12, High 15–25
   - Dermal level of risk (H1/H2/M1/M2/L) is taken from Form C2 as entered.
   - Action Priority (Table 18), plus all summary tables (4.1–4.10, 5.1–5.9)
4. The **QA panel** flags: RR on the form ≠ recalculated HR×ER, HR = NA, Form B "dermal = Y" with no C2 row, SDS older than 5 years, and high risk without a monitoring or surveillance decision.
5. **Download Word** produces Cover, Form A notification, Executive Summary, 1.0–6.0 and the Appendix list, in the ESM final-report structure.

Always review the generated text and tables before signing. The assessor remains responsible for professional judgement.

The original `index.html` (before the Noise/CHRA links were added) is kept in `_backup_before_Noise_CHRA_2026-11-01/`.

## Update (2 Nov 2026) — aligned with CEM
- **Section 1:** company details and logo (shared with CEM), then Client & monitoring.
- **Noise instruments (Table 3):** each instrument is a card with photos. "📋 Copy equipment from previous report" copies instruments, calibration dates and photos from any earlier report.
- **Noise Table 7:** Min, Max and L(average). Avg dB(A) is automatic: Avg = 10 log[(10^(Lmin/10) + 10^(Lmax/10) + 10^(Lavg/10)) / 3].
- **Appendices section:** upload PDF or images per appendix. They're inserted after each appendix title page in Word and the PDF preview.
  - Noise: A–I.
  - CHRA: 1A–1G Forms A–D per work unit, plus 2, 3 and 4.
- **Download section:** "Download full report…" asks PDF or Word, plus Download Excel and Print this page.
- **Complete & save to dashboard:** same login and `ih_jobs` table as CEM.
  - Noise: one job per SEG (highest LEX,8h vs 85 dB(A)).
  - CHRA: one job per report (priority from AP1/AP2).
- **🗑 Clear data:** clears the current report and its appendix files. Company details and logo are kept.
- Scripts load with a version tag (`?v=…`), so the browser always picks up new files after an update. If a page still looks old, press Ctrl+F5.
