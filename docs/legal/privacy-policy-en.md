# Privacy Policy — Jiqiao Shiyun (機巧時運)

**Effective date:** [DATE]
**Last updated:** [DATE]
**Data controller:** [LEGAL ENTITY NAME], unified business number [NUMBER], [ADDRESS], Taiwan (R.O.C.)
**Contact for privacy matters:** [PRIVACY EMAIL]

> **Before you deploy this:** unlike a liability clause, a privacy policy cannot protect you by being broad — it protects you by being *accurate*. Under Taiwan's Personal Data Protection Act, and under the GDPR if you have any users in the EEA or UK, a policy that overstates or understates what you actually do is itself the violation. Every statement below must be checked against what the system genuinely does before you publish. Sections marked **[VERIFY]** describe behaviour you must confirm or correct.

---

## 1. Scope

1.1 This Privacy Policy explains how we collect, use, disclose and protect personal data when you use the Jiqiao Shiyun website at chengqi.tw and associated services (the "**Service**").

1.2 It applies to all users of the Service. Additional notices may be presented at the point of collection for specific features.

1.3 Capitalised terms not defined here have the meaning given in our Terms of Service.

---

## 2. Personal data we collect

### 2.1 Data you provide directly

| Category | Examples | Why we need it |
|---|---|---|
| Account data | Email address, display name, account handle, password (stored only as a bcrypt hash, never in plain text) | To create and secure your account, authenticate you, and contact you about the Service |
| Profile data | Biography, avatar image, avatar colour, privacy setting | To present your public profile as you choose |
| User Content | Photographs, posts, captions, comments, tags, solar-term labels, location labels, calendar projects | To provide the community and creative features you use |
| Transaction data | Order records, items, amounts, delivery method, invoice preference | To process orders and comply with accounting and tax obligations |
| Support data | Messages you send us, including topic, message body, and the email address you provide | To respond to your enquiry and keep a record of it |
| Marketplace data | Listing prices, licence tiers | To operate the marketplace |

### 2.2 Data collected automatically

| Category | Examples | Why we need it |
|---|---|---|
| Authentication data | Session identifier, session creation and expiry time | To keep you signed in securely |
| Security and audit logs | IP address, user agent, timestamp, event type (sign-in, sign-in failure, account lock-out, profile change, content report, administrative action) | To detect and investigate unauthorised access, abuse and fraud, and to meet our security obligations |
| Technical data | Device and browser characteristics necessary to serve the page correctly | To deliver and troubleshoot the Service |

### 2.3 Data we do **not** collect

- **We do not collect biometric identifiers.** Where the Service performs on-device image recognition (for example scanning a printed card), the analysis is carried out entirely within your browser and neither the image nor the derived features are transmitted to our servers. **[VERIFY: confirm this remains true of every scanning feature before publishing.]**
- We do not knowingly collect data from children under thirteen (13).
- We do not collect special-category data (health, religious belief, political opinion, sexual orientation, criminal records) and ask that you do not submit such data through the Service.
- We do not receive or store full payment-card numbers; these are handled by our payment providers.

---

## 3. How we use personal data, and our legal basis

Where the GDPR applies, we rely on the following legal bases:

| Purpose | Legal basis |
|---|---|
| Creating and administering your account; providing the features you request; processing orders | Performance of a contract |
| Sending transactional email (verification, password reset, order confirmation) | Performance of a contract |
| Securing the Service: detecting unauthorised access, rate-limiting, account lock-out, fraud prevention, audit logging | Legitimate interests — keeping the Service and its users safe |
| Investigating reports of unlawful or infringing Content | Legitimate interests, and compliance with legal obligation |
| Maintaining accounting, tax and transaction records | Compliance with legal obligation |
| Improving and troubleshooting the Service | Legitimate interests |
| Any optional analytics or marketing communications | Consent, which you may withdraw at any time |

We do not use your personal data for automated decision-making producing legal or similarly significant effects.

---

## 4. Artificial-intelligence features

4.1 When you use the AI advisory feature, the text of your question, together with limited contextual information about the current calendar date, is transmitted to a third-party artificial-intelligence provider in order to generate a response.

4.2 **Do not enter personal data, confidential information, or the personal data of others into the AI feature.** Once submitted, that text leaves our infrastructure and is processed under the provider's terms.

4.3 We do not use your questions or the resulting Output to train our own models. Our provider's use of transmitted data is governed by that provider's agreement with us; we select providers that contractually undertake not to train on API-submitted content, but we cannot guarantee the practices of any third party. **[VERIFY: confirm current provider terms.]**

4.4 We retain limited records where a request is refused for falling outside the permitted scope of the feature, for abuse-prevention purposes.

---

## 5. Cookies and similar technologies

5.1 We use a single strictly necessary cookie to maintain your signed-in session. It is set with the `HttpOnly` attribute (so it cannot be read by page scripts), the `SameSite=Strict` attribute (so it is not sent on cross-site requests), and the `Secure` attribute in production.

5.2 We also use a CSRF token mechanism to protect against cross-site request forgery.

5.3 A theme preference is stored in your browser's local storage. It contains no personal data and never leaves your device.

5.4 **We do not currently use any third-party analytics, advertising, profiling or cross-site tracking technology.** If we introduce any such technology in the future, we will update this Policy and, where consent is required, obtain it before deployment. **[VERIFY before publishing, and re-verify whenever a new script or embed is added.]**

---

## 6. Disclosure of personal data

6.1 We do **not** sell your personal data, and we do not share it for cross-context behavioural advertising.

6.2 We disclose personal data only as follows:

- **Publicly, at your direction.** Your handle, display name, avatar, biography, and any Content you post publicly are visible to other users and to the open internet. Consider carefully what you make public.
- **Service providers (processors)** who host, store, transmit or process data on our behalf under written contract and on our instructions only — including cloud hosting and database services, email delivery services, payment providers, map and geocoding services, and artificial-intelligence providers.
- **Other users**, where you enter into a marketplace transaction, to the extent necessary to complete it.
- **Professional advisers** — lawyers, accountants and auditors — under duties of confidentiality.
- **Authorities**, where we are required to do so by law, court order or a lawful request from a competent authority, or where disclosure is necessary to establish, exercise or defend legal claims, or to prevent imminent harm.
- **A successor entity**, in connection with a merger, acquisition, reorganisation or sale of assets, subject to this Policy continuing to apply.

---

## 7. International transfers

7.1 Our infrastructure is hosted in [REGION — e.g. asia-east1, Taiwan]. Some service providers may process data outside Taiwan.

7.2 Where personal data is transferred out of the EEA or the UK, we rely on an adequacy decision or on Standard Contractual Clauses together with any supplementary measures required, so that the data receives an essentially equivalent level of protection. You may request further information at [PRIVACY EMAIL].

---

## 8. Retention

8.1 We retain personal data for no longer than is necessary for the purposes for which it was collected:

| Data | Retention |
|---|---|
| Account and profile data | For the life of your account, then deleted on account deletion |
| User Content | Until you delete it, or until account deletion |
| Session records | Until expiry or sign-out |
| Security and audit logs | [SPECIFY — commonly 6 to 12 months] |
| Support messages | [SPECIFY — commonly 24 months] |
| Order and transaction records | As required by tax and accounting law — in Taiwan, generally five (5) years — notwithstanding account deletion |
| Password reset and verification tokens | Until used or expired |

8.2 Backups are cycled and residual copies may persist for a limited period after deletion before being overwritten.

---

## 9. Your rights

9.1 Subject to applicable law, you may:

- **Access** the personal data we hold about you, and obtain a copy;
- **Rectify** inaccurate or incomplete data;
- **Erase** your data ("right to be forgotten"), subject to records we must retain by law;
- **Restrict** or **object to** processing carried out on the basis of our legitimate interests, including on grounds relating to your particular situation;
- **Port** data you provided to us, in a structured, commonly used, machine-readable format;
- **Withdraw consent** at any time where processing is based on consent, without affecting the lawfulness of processing before withdrawal;
- **Not be subject** to a decision based solely on automated processing producing legal or similarly significant effects.

9.2 Several of these rights are exercisable directly within the Service under **Settings → Account security**, including data export and account deletion. For anything else, contact [PRIVACY EMAIL].

9.3 We will respond within thirty (30) days, or within one (1) month where the GDPR applies, and may extend where a request is complex. We may need to verify your identity before acting.

9.4 We do not charge for responding to a request, unless it is manifestly unfounded or excessive.

9.5 **Complaints.** If you are dissatisfied with our handling of your data, please contact us first at [PRIVACY EMAIL]. You also have the right to complain to a supervisory authority: in Taiwan, the competent authority under the Personal Data Protection Act; in the EEA or UK, your local data-protection authority.

---

## 10. Security

10.1 We implement technical and organisational measures appropriate to the risk, including: password hashing with bcrypt (cost factor 12); server-side sessions with `HttpOnly`, `SameSite=Strict` cookies; CSRF protection on state-changing requests; rate limiting and progressive account lock-out; transport encryption (HTTPS) enforced with HSTS; a Content Security Policy; role-based access control for administrative functions; audit logging of security-relevant events; upload validation including MIME-signature checking and size limits; and least-privilege access to production systems.

10.2 **No system is perfectly secure.** While we take these measures seriously, we cannot guarantee absolute security, and you provide data at your own risk. Please use a strong, unique password and keep your credentials confidential.

10.3 In the event of a personal-data breach likely to result in a risk to your rights and freedoms, we will notify the relevant supervisory authority and, where required, affected users, without undue delay.

---

## 11. Children

11.1 The Service is not directed to children under thirteen (13), and we do not knowingly collect their personal data.

11.2 Users under the age of majority require the consent of a parent or guardian, as set out in our Terms of Service.

11.3 If you believe a child has provided us with personal data, contact [PRIVACY EMAIL] and we will delete it promptly.

---

## 12. Third-party links and content

The Service may contain links to, or content from, third-party websites and services. We are not responsible for their privacy practices. Review their policies before providing personal data.

---

## 13. Changes to this Policy

13.1 We may update this Policy from time to time. Where a change is material, we will provide reasonable prior notice within the Service or by email and update the "Last updated" date above.

13.2 Where a change requires your consent under applicable law, we will obtain it before the change takes effect.

---

## 14. Contact

**[LEGAL ENTITY NAME]**
[ADDRESS], Taiwan (R.O.C.)
Privacy enquiries: [PRIVACY EMAIL]
Security reports: [SECURITY EMAIL]
Data protection representative (if appointed): [NAME / CONTACT]

---

*End of Privacy Policy.*
