# 🏢 HOSTEL 7 MESS PORTAL (Warden-Approval Prototype)

A phone-first, enterprise-grade web frontend built strictly according to the **Frontend Build Brief & API Guide (v3)** for the upcoming hostel warden approval demo.

---

## 🎯 Five-Minute Demo Story (Section 1)

1. **Student Login & Payment Submission:**
   - Log in using an 11-digit Scholar / Roll Number (or click **Student** on the 1-click demo bar).
   - Click **+ Submit Payment**, click **⚡ Quick Fill Demo Data**, and submit the payment.
   - Instantly receive a **prominent receipt number** (e.g., `H7-REC-202610-1001`) with IST timestamp and screenshot preview ready for screenshotting or printing.
2. **Reviewer Audit:**
   - Switch role to **Reviewer** (Caretaker) using the top demo bar.
   - Open **Payments to Review**, click **Inspect Screenshot & Audit**.
   - Inspect the screenshot beside the student transaction details. Click **✓ Accept Payment** (or **✕ Reject** with mandatory reason).
3. **Student Verification Reflection:**
   - Switch back to **Student** &rarr; see payment status updated to **Accepted** with a green badge in **My Payments History**.
4. **Complaint Lifecycle & Step-by-Step Resolution:**
   - As student, file a grievance (e.g., RO drinking water filter issue) with live character counters.
   - Switch to **Admin/Warden** &rarr; inspect ticket and advance it step-by-step with mandatory notes (`submitted` &rarr; `seen` &rarr; `action_taken` &rarr; `closed`).
   - Switch back to **Student** &rarr; view the progress timeline. Submit resolution feedback (`Solved`, `Partly`, or `Not Solved` - if `Not Solved`, ticket automatically reopens!).
5. **Monthly Menu Viewing & Staff Management:**
   - All roles can view the high-resolution photo of the **Hostel No.07 October 2026 Menu** with zoom & download.
   - Reviewer / Admin can upload or replace a menu for any month.

---

## 🛡️ Scope & Requirements (Section 4 Compliance)

### In-Scope (Implemented 100%):
- ✅ **Base Auth & Role-Based Navigation**: Student, Reviewer, Admin with auto-redirect on 401 and Change Password flow.
- ✅ **Payments**: Submit form, field validations (6–50 chars, no spaces, amount > 0, month YYYY-MM, max 2MB screenshot), prominent receipt screen, rejection reasons, duplicate ID protection.
- ✅ **Complaints**: Live character counters (title max 150, description max 2000), status timeline with admin notes, conditional feedback with reopen logic, single-step admin status progression.
- ✅ **Monthly Menu**: Photo viewer of Hostel No.07 October 2026 Menu, month picker, empty state, reviewer/admin upload.
- ✅ **Admin Extras (Part 5)**: User list, create user, deactivate/activate user.
- ✅ **Resilience Dual-Mode**: Live backend connection to `https://hostel-backend-gkou.onrender.com` + automatic fallback to `MockStore` for offline/cold-boot presentation stability.

### Explicitly Removed (Out of Scope):
- ❌ Digital Gate Pass / Out-Pass removed.
- ❌ Food ratings, typed daily menu widgets, and Sunday special meal democracy poll removed.
- ❌ Contacts directory removed.

---

## 🏃 How to Run the Prototype

1. **Option 1: Direct Browser Launch**
   - Double-click `index.html` on your computer.
   - Opens in Chrome, Edge, Safari, or mobile browsers with zero setup or build dependencies.

2. **Option 2: VS Code Live Server**
   - Open folder `C:\Users\dangi\.gemini\antigravity\scratch\hostel-mess-frontend` in VS Code.
   - Right-click `index.html` &rarr; **Open with Live Server**.

3. **Preloaded Demo Credentials:**
   - **Student:** `23111004092` / `student123`
   - **Reviewer:** `REV007` / `reviewer123`
   - **Admin:** `ADM001` / `admin123`
   *(Or simply use the 1-click quick login buttons in the header!)*
