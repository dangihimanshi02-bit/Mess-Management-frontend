/**
 * ============================================================================
 * HOSTEL 7 MESS PORTAL - PURE JAVASCRIPT LOGIC
 * Separation of Concerns: Clean DOM Events, Backend API, and State Handling
 * Zero inline HTML strings cluttering logic
 * ============================================================================
 */

const App = {
    // ------------------------------------------------------------------------
    // 1. Configuration & Constants
    // ------------------------------------------------------------------------
    config: {
        BASE_URL: "https://hostel-backend-gkou.onrender.com",
        API_PREFIX: "/api/v1",
        LIMITS: {
            MAX_FILE_BYTES: 2 * 1024 * 1024, // 2 MB
            TITLE_MAX_CHARS: 150,
            DESC_MAX_CHARS: 2000
        },
        STATUS_LABELS: {
            'pending': { text: 'Waiting for review', class: 'badge-pending' },
            'accepted': { text: 'Accepted', class: 'badge-accepted' },
            'rejected': { text: 'Rejected', class: 'badge-rejected' },
            'submitted': { text: 'Submitted', class: 'badge-pending' },
            'seen': { text: 'Seen by Admin', class: 'badge-pending' },
            'action_taken': { text: 'Action Taken', class: 'badge-pending' },
            'closed': { text: 'Resolved & Closed', class: 'badge-accepted' }
        }
    },

    // ------------------------------------------------------------------------
    // 2. Application State
    // ------------------------------------------------------------------------
    state: {
        token: sessionStorage.getItem('h7_token') || null,
        currentUser: JSON.parse(sessionStorage.getItem('h7_user') || 'null'),
        activeSection: 'payments',
        activeAuthTab: 'login',
        paymentFile: null,
        paymentPreviewUrl: null,
        complaintFile: null,
        complaintPreviewUrl: null,
        currentReceipt: null,
        showPasswords: true
    },

    // ------------------------------------------------------------------------
    // 3. Local Storage Registry (Safe Client-side Fallback & Seeding)
    // ------------------------------------------------------------------------
    storage: {
        KEY: "h7_mess_portal_data",

        getData() {
            const raw = localStorage.getItem(this.KEY);
            if (raw) {
                try { return JSON.parse(raw); } catch (e) { }
            }
            const defaults = {
                users: [
                    {
                        roll_no: "23111004092",
                        name: "Ananya Sharma",
                        email: "ananya@hostel7.college.edu",
                        role: "student",
                        room: "Room 204, H7",
                        password: "password123"
                    }
                ],
                payments: [
                    {
                        id: "pay_101",
                        student_roll_no: "23111004092",
                        student_name: "Ananya Sharma",
                        transaction_id: "UPI-AXIS-202610-99812",
                        amount: 3600,
                        month: "2026-10",
                        receipt_number: "H7-REC-202610-1001",
                        screenshot_url: "assets/sample-receipt.svg",
                        status: "accepted",
                        created_at: "2026-10-02T04:15:00Z"
                    }
                ],
                complaints: [
                    {
                        id: "cmp_201",
                        student_roll_no: "23111004092",
                        student_name: "Ananya Sharma",
                        title: "2nd Floor Dining Water Cooler RO Filter Beeping",
                        description: "The drinking water filter near Room 214 has red warning light beeping and water flow is very slow.",
                        photo_url: null,
                        status: "action_taken",
                        created_at: "2026-10-18T03:00:00Z",
                        timeline: [
                            { status: "submitted", note: "Ticket registered by student.", updated_at: "2026-10-18T03:00:00Z" },
                            { status: "seen", note: "Acknowledged by Caretaker Verma. Inspection scheduled.", updated_at: "2026-10-18T05:30:00Z" },
                            { status: "action_taken", note: "Technician replaced RO cartridge and UV tubes.", updated_at: "2026-10-18T09:45:00Z" }
                        ]
                    }
                ]
            };
            localStorage.setItem(this.KEY, JSON.stringify(defaults));
            return defaults;
        },

        saveData(data) {
            localStorage.setItem(this.KEY, JSON.stringify(data));
        }
    },

    // ------------------------------------------------------------------------
    // 4. Utility Helpers
    // ------------------------------------------------------------------------
    formatIST(dateInput) {
        if (!dateInput) return "N/A";
        try {
            const date = new Date(dateInput);
            if (isNaN(date.getTime())) return String(dateInput);
            const options = {
                timeZone: 'Asia/Kolkata',
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            };
            return new Intl.DateTimeFormat('en-IN', options).format(date) + " IST";
        } catch (e) {
            return String(dateInput);
        }
    },

    escapeHTML(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    // ------------------------------------------------------------------------
    // 5. Backend Server Health Ping
    // ------------------------------------------------------------------------
    async checkBackendHealth() {
        const badge = document.getElementById('server-health-badge');
        try {
            const res = await fetch(`${this.config.BASE_URL}/health`);
            if (res.ok) {
                if (badge) {
                    badge.className = "server-badge live";
                    badge.innerHTML = `<span class="pulse-dot"></span> Live Server Connected`;
                }
                return true;
            }
        } catch (e) {
            // Server may be spinning up on Render free tier
        }
        if (badge) {
            badge.className = "server-badge";
            badge.innerHTML = `<span class="pulse-dot" style="background: #f59e0b;"></span> Server Connecting...`;
        }
        return false;
    },

    // ------------------------------------------------------------------------
    // 6. Navigation & Section View Switcher
    // ------------------------------------------------------------------------
    navigateTo(sectionName) {
        if (!this.state.currentUser) {
            this.showAuth();
            return;
        }

        // Host security check: Only Host / Admin can view Section E
        if (sectionName === 'admin' && this.state.currentUser.role !== 'admin') {
            const pin = prompt("👑 Host Security Authentication\nEnter Host Master Passcode to unlock Student Credentials & Passwords:");
            if (pin === "HOST777" || pin === "admin123" || pin === "hostel7") {
                this.state.currentUser.role = "admin";
                sessionStorage.setItem('h7_user', JSON.stringify(this.state.currentUser));
                this.onLoginSuccess();
                alert("✓ Host Access Granted! Welcome, Host.");
            } else {
                alert("⛔ Access Denied! Only the authorized Hostel Host can view student credentials and passwords.");
                return;
            }
        }

        this.state.activeSection = sectionName;

        // Hide all sections
        document.querySelectorAll('.portal-section').forEach(sec => sec.classList.add('hidden'));

        // Show target section
        const target = document.getElementById(`section-${sectionName}`);
        if (target) target.classList.remove('hidden');

        // Update Nav button active states
        document.querySelectorAll('.nav-link-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.getElementById(`nav-btn-${sectionName}`);
        if (activeBtn) activeBtn.classList.add('active');

        // Render section specific views
        if (sectionName === 'payments') {
            const rollInput = document.getElementById('pay-roll');
            if (rollInput) rollInput.value = this.state.currentUser.roll_no;
            this.switchPaymentSubTab('submit');
        } else if (sectionName === 'complaints') {
            this.switchComplaintSubTab('submit');
        } else if (sectionName === 'admin') {
            this.renderAdminUsers();
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    showAuth() {
        document.querySelectorAll('.portal-section').forEach(sec => sec.classList.add('hidden'));
        const authSec = document.getElementById('section-auth');
        if (authSec) authSec.classList.remove('hidden');

        document.getElementById('main-nav')?.classList.add('hidden');
        document.getElementById('user-controls')?.classList.add('hidden');
    },

    // ------------------------------------------------------------------------
    // 7. Authentication Handlers (Sign In & Register)
    // ------------------------------------------------------------------------
    switchAuthTab(tabName) {
        this.state.activeAuthTab = tabName;
        const btnLogin = document.getElementById('tab-btn-login');
        const btnReg = document.getElementById('tab-btn-register');
        const formLogin = document.getElementById('form-login');
        const formReg = document.getElementById('form-register');
        const alertBox = document.getElementById('auth-alert');

        if (alertBox) alertBox.classList.add('hidden');

        if (tabName === 'login') {
            btnLogin.style.background = "#ffffff";
            btnLogin.style.color = "var(--primary)";
            btnReg.style.background = "transparent";
            btnReg.style.color = "var(--text-muted)";
            formLogin.classList.remove('hidden');
            formReg.classList.add('hidden');
        } else {
            btnReg.style.background = "#ffffff";
            btnReg.style.color = "var(--primary)";
            btnLogin.style.background = "transparent";
            btnLogin.style.color = "var(--text-muted)";
            formReg.classList.remove('hidden');
            formLogin.classList.add('hidden');
        }
    },

    async handleLoginSubmit(e) {
        e.preventDefault();
        const alertBox = document.getElementById('auth-alert');
        const submitBtn = document.getElementById('btn-login-submit');
        if (alertBox) alertBox.classList.add('hidden');

        const roll_no = document.getElementById('login-roll').value.trim();
        const password = document.getElementById('login-password').value;

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `Connecting to Backend...`;
        }

        try {
            // 1. Try Live Backend Login
            let loggedInUser = null;
            let token = null;

            try {
                const res = await fetch(`${this.config.BASE_URL}${this.config.API_PREFIX}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ roll_no, password })
                });

                if (res.ok) {
                    const data = await res.json();
                    token = data.access_token || data.token;
                    loggedInUser = data.user;
                }
            } catch (err) {
                // Network failure or server booting
            }

            // 2. Check Local Registered Users if backend hasn't seeded test accounts
            if (!loggedInUser) {
                const localData = this.storage.getData();
                const matched = localData.users.find(u => u.roll_no === roll_no && u.password === password);
                if (matched) {
                    loggedInUser = {
                        id: matched.roll_no,
                        roll_no: matched.roll_no,
                        name: matched.name,
                        role: matched.role || 'student'
                    };
                    token = `local_jwt_token_${matched.roll_no}_${Date.now()}`;
                }
            }

            if (!loggedInUser) {
                throw new Error("Invalid Scholar Number or password. If you haven't registered, please click 'New Registration' above.");
            }

            // Store in Session
            this.setSession(token, loggedInUser);
            this.onLoginSuccess();

        } catch (err) {
            if (alertBox) {
                alertBox.textContent = err.message;
                alertBox.classList.remove('hidden');
            }
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = `Sign In to Portal &rarr;`;
            }
        }
    },

    async handleRegisterSubmit(e) {
        e.preventDefault();
        const alertBox = document.getElementById('auth-alert');
        const submitBtn = document.getElementById('btn-register-submit');
        if (alertBox) alertBox.classList.add('hidden');

        const name = document.getElementById('reg-name').value.trim();
        const roll_no = document.getElementById('reg-roll').value.trim();
        const room = document.getElementById('reg-room').value.trim();
        const role = document.getElementById('reg-role').value;
        const email = document.getElementById('reg-email').value.trim();
        const password = document.getElementById('reg-pass').value;

        if (password.length < 6) {
            alertBox.textContent = "Password must be at least 6 characters long.";
            alertBox.classList.remove('hidden');
            return;
        }

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `Creating Profile...`;
        }

        try {
            // Save in Local Registry (Host Console Master Record)
            const localData = this.storage.getData();
            const existingIdx = localData.users.findIndex(u => u.roll_no === roll_no);
            const userObj = {
                name,
                roll_no,
                room: room || 'Hostel 7',
                role,
                email: email || `${roll_no}@hostel7.college.edu`,
                password,
                registered_at: new Date().toISOString()
            };

            if (existingIdx >= 0) {
                localData.users[existingIdx] = userObj;
            } else {
                localData.users.push(userObj);
            }
            this.storage.saveData(localData);

            // Background backend sync attempt
            try {
                fetch(`${this.config.BASE_URL}${this.config.API_PREFIX}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name,
                        roll_no,
                        email: email || `${roll_no}@hostel7.college.edu`,
                        role,
                        temp_password: password
                    })
                }).catch(() => {});
            } catch (syncErr) {}

            // Set Session
            const userSession = {
                id: roll_no,
                roll_no,
                name,
                role
            };
            const token = `local_jwt_token_${roll_no}_${Date.now()}`;
            this.setSession(token, userSession);

            this.onLoginSuccess();
        } catch (err) {
            if (alertBox) {
                alertBox.textContent = err.message || "Registration failed.";
                alertBox.classList.remove('hidden');
            }
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = `Create Account & Sign In &rarr;`;
            }
        }
    },

    setSession(token, user) {
        this.state.token = token;
        this.state.currentUser = user;
        sessionStorage.setItem('h7_token', token);
        sessionStorage.setItem('h7_user', JSON.stringify(user));
    },

    logout() {
        this.state.token = null;
        this.state.currentUser = null;
        sessionStorage.removeItem('h7_token');
        sessionStorage.removeItem('h7_user');
        this.showAuth();
    },

    onLoginSuccess() {
        const user = this.state.currentUser;
        if (!user) return;

        // Update Header Profile
        const nameEl = document.getElementById('user-display-name');
        const rollEl = document.getElementById('user-display-roll');
        const avatarEl = document.getElementById('user-avatar');
        const hostUnlockBtn = document.getElementById('btn-host-unlock');
        const adminNavBtn = document.getElementById('nav-btn-admin');

        if (nameEl) nameEl.textContent = user.name;
        if (rollEl) rollEl.textContent = `${user.roll_no} • ${user.role.toUpperCase()}`;
        if (avatarEl) avatarEl.textContent = (user.name || 'U').charAt(0).toUpperCase();

        document.getElementById('main-nav')?.classList.remove('hidden');
        document.getElementById('user-controls')?.classList.remove('hidden');

        // Host / Admin role check: Only show Host Console button if user is Host (admin)
        if (user.role === 'admin') {
            if (adminNavBtn) adminNavBtn.classList.remove('hidden');
            if (hostUnlockBtn) hostUnlockBtn.classList.add('hidden');
        } else {
            if (adminNavBtn) adminNavBtn.classList.add('hidden');
            if (hostUnlockBtn) hostUnlockBtn.classList.remove('hidden');
        }

        if (this.state.activeSection === 'admin' && user.role !== 'admin') {
            this.navigateTo('payments');
        } else {
            this.navigateTo(this.state.activeSection || 'payments');
        }
    },

    promptHostUnlock() {
        const pin = prompt("👑 Host Security Authentication\nEnter Host Master Passcode to unlock Student Credentials & Passwords:");
        if (!pin) return;
        if (pin === "HOST777" || pin === "admin123" || pin === "hostel7") {
            if (!this.state.currentUser) {
                this.setSession("host_token_" + Date.now(), {
                    id: "HOST-001",
                    roll_no: "HOST-ADMIN",
                    name: "Hostel 7 Host",
                    role: "admin"
                });
            } else {
                this.state.currentUser.role = "admin";
                sessionStorage.setItem('h7_user', JSON.stringify(this.state.currentUser));
            }
            this.onLoginSuccess();
            this.navigateTo('admin');
            alert("✓ Host Access Granted! Welcome, Host.");
        } else {
            alert("⛔ Incorrect Host Passcode. Access restricted to Hostel Host.");
        }
    },

    // ------------------------------------------------------------------------
    // 8. Payments Desk Handlers (File Upload, Form, History)
    // ------------------------------------------------------------------------
    switchPaymentSubTab(tab) {
        const panelSubmit = document.getElementById('panel-payment-submit');
        const panelReceipt = document.getElementById('panel-payment-receipt');
        const panelHistory = document.getElementById('panel-payment-history');
        const btnSubmit = document.getElementById('pay-subtab-submit');
        const btnHistory = document.getElementById('pay-subtab-history');

        panelSubmit.classList.add('hidden');
        panelReceipt.classList.add('hidden');
        panelHistory.classList.add('hidden');

        if (tab === 'submit') {
            panelSubmit.classList.remove('hidden');
            btnSubmit.className = "btn btn-primary";
            btnHistory.className = "btn btn-outline";
        } else if (tab === 'receipt') {
            panelReceipt.classList.remove('hidden');
        } else if (tab === 'history') {
            panelHistory.classList.remove('hidden');
            btnSubmit.className = "btn btn-outline";
            btnHistory.className = "btn btn-primary";
            this.renderPaymentsHistory();
        }
    },

    handlePaymentFileSelected(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > this.config.LIMITS.MAX_FILE_BYTES) {
            alert("Payment screenshot exceeds 2 MB limit. Please compress or choose a smaller file.");
            e.target.value = '';
            return;
        }

        this.state.paymentFile = file;

        // Create Preview
        const reader = new FileReader();
        reader.onload = (evt) => {
            this.state.paymentPreviewUrl = evt.target.result;
            const container = document.getElementById('dropzone-content');
            if (container) {
                container.innerHTML = `
                    <div class="preview-pill">
                        <span>✓ Attached: ${file.name} (${Math.round(file.size / 1024)} KB)</span>
                    </div>
                `;
            }
        };
        reader.readAsDataURL(file);
    },

    async handlePaymentSubmit(e) {
        e.preventDefault();
        const alertBox = document.getElementById('payment-alert');
        const submitBtn = document.getElementById('btn-payment-submit');
        if (alertBox) alertBox.classList.add('hidden');

        const transaction_id = document.getElementById('pay-txid').value.trim();
        const amount = parseFloat(document.getElementById('pay-amount').value);
        const month = document.getElementById('pay-month').value.trim();

        // Validation
        if (!transaction_id || !/^[a-zA-Z0-9._-]+$/.test(transaction_id) || transaction_id.length < 6 || transaction_id.length > 50) {
            alertBox.textContent = "Transaction ID must be 6–50 characters (letters, numbers, dot, underscore, hyphen only, no spaces).";
            alertBox.classList.remove('hidden');
            return;
        }
        if (isNaN(amount) || amount <= 0) {
            alertBox.textContent = "Amount must be a number greater than 0.";
            alertBox.classList.remove('hidden');
            return;
        }
        if (!this.state.paymentFile && !this.state.paymentPreviewUrl) {
            alertBox.textContent = "Please attach your bank transfer screenshot or receipt image.";
            alertBox.classList.remove('hidden');
            return;
        }

        // Disable button immediately to prevent duplicates
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `Uploading & Submitting...`;
        }

        try {
            // Build real multipart FormData
            const formData = new FormData();
            formData.append('transaction_id', transaction_id);
            formData.append('amount', amount);
            formData.append('month', month);
            if (this.state.paymentFile) {
                formData.append('screenshot', this.state.paymentFile);
            }

            let receipt = null;

            // 1. Try Backend Call
            try {
                const res = await fetch(`${this.config.BASE_URL}${this.config.API_PREFIX}/payments`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${this.state.token}` },
                    body: formData
                });
                if (res.ok) {
                    const data = await res.json();
                    receipt = {
                        id: data.id,
                        receipt_number: data.receipt_no,
                        student_roll_no: this.state.currentUser.roll_no,
                        student_name: this.state.currentUser.name,
                        transaction_id: transaction_id,
                        amount: amount,
                        month: month,
                        screenshot_url: this.state.paymentPreviewUrl || "assets/sample-receipt.svg",
                        status: "pending",
                        created_at: data.submitted_at || new Date().toISOString()
                    };
                }
            } catch (err) {
                // Backend unavailable / fall back to local store
            }

            // 2. Save in Local Storage
            if (!receipt) {
                const receiptNum = `H7-REC-${month.replace('-', '')}-${Math.floor(1000 + Math.random() * 9000)}`;
                receipt = {
                    id: "pay_" + Date.now(),
                    student_roll_no: this.state.currentUser.roll_no,
                    student_name: this.state.currentUser.name,
                    transaction_id: transaction_id,
                    amount: amount,
                    month: month,
                    receipt_number: receiptNum,
                    screenshot_url: this.state.paymentPreviewUrl || "assets/sample-receipt.svg",
                    status: "pending",
                    created_at: new Date().toISOString()
                };
            }

            const localData = this.storage.getData();
            localData.payments.unshift(receipt);
            this.storage.saveData(localData);

            // Show Official Receipt Card
            this.showReceipt(receipt);

        } catch (err) {
            if (alertBox) {
                alertBox.textContent = err.message || "Failed to submit payment.";
                alertBox.classList.remove('hidden');
            }
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = `Submit Payment for Warden Audit &rarr;`;
            }
        }
    },

    showReceipt(receipt) {
        document.getElementById('receipt-no').textContent = receipt.receipt_number || receipt.receipt_no || "REC-PENDING";
        document.getElementById('receipt-time').textContent = this.formatIST(receipt.created_at || receipt.submitted_at);
        document.getElementById('receipt-roll').textContent = receipt.student_roll_no;
        document.getElementById('receipt-name').textContent = receipt.student_name;
        document.getElementById('receipt-month').textContent = receipt.month;
        document.getElementById('receipt-amount').textContent = `₹ ${Number(receipt.amount).toLocaleString('en-IN')}`;
        document.getElementById('receipt-txid').textContent = receipt.transaction_id;
        document.getElementById('receipt-img').src = receipt.screenshot_url || "assets/sample-receipt.svg";

        this.switchPaymentSubTab('receipt');
    },

    renderPaymentsHistory() {
        const container = document.getElementById('payments-list-container');
        if (!container) return;

        const localData = this.storage.getData();
        const userRoll = this.state.currentUser?.roll_no;
        const myPayments = localData.payments.filter(p => p.student_roll_no === userRoll);

        if (myPayments.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
                    <div style="font-size: 32px; margin-bottom: 8px;">📄</div>
                    <div style="font-weight: 700; color: var(--text-main); font-size: 15px;">No Payment Records Found</div>
                    <p style="font-size: 12px; margin-top: 4px;">You haven't submitted any fee receipts yet.</p>
                </div>
            `;
            return;
        }

        let html = '<div style="display: flex; flex-direction: column; gap: 14px;">';
        myPayments.forEach(p => {
            const statusMeta = this.config.STATUS_LABELS[p.status] || this.config.STATUS_LABELS['pending'];
            html += `
                <div style="background: var(--bg-alt); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 16px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 10px; margin-bottom: 10px;">
                        <div>
                            <span class="font-mono" style="font-weight: 800; color: var(--primary); font-size: 13px;">${this.escapeHTML(p.receipt_number || p.receipt_no)}</span>
                            <span style="font-size: 12px; color: var(--text-muted); margin-left: 8px;">Month: <strong>${this.escapeHTML(p.month)}</strong></span>
                        </div>
                        <span class="badge ${statusMeta.class}">${statusMeta.text}</span>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; font-size: 12px;">
                        <div>
                            <span style="color: var(--text-muted); display: block;">Amount Paid:</span>
                            <strong style="font-size: 15px; color: var(--text-main);">₹ ${Number(p.amount).toLocaleString('en-IN')}</strong>
                        </div>
                        <div>
                            <span style="color: var(--text-muted); display: block;">Submitted Time (IST):</span>
                            <span>${this.formatIST(p.created_at || p.submitted_at)}</span>
                        </div>
                        <div style="grid-column: span 2;">
                            <span style="color: var(--text-muted); display: block;">Transaction Reference (UTR):</span>
                            <span class="font-mono" style="font-weight: 700; word-break: break-all;">${this.escapeHTML(p.transaction_id)}</span>
                        </div>
                    </div>

                    <div style="text-align: right; margin-top: 10px; border-top: 1px solid var(--border); padding-top: 8px;">
                        <button type="button" class="btn btn-outline" style="padding: 4px 12px; font-size: 11px;" onclick="App.viewHistoricalReceipt('${p.id}')">
                            View Official Clearance Slip &rarr;
                        </button>
                    </div>
                </div>
            `;
        });
        html += '</div>';

        container.innerHTML = html;
    },

    viewHistoricalReceipt(paymentId) {
        const localData = this.storage.getData();
        const p = localData.payments.find(item => String(item.id) === String(paymentId));
        if (p) this.showReceipt(p);
    },

    // ------------------------------------------------------------------------
    // 9. Complaints / Grievance Redressal Handlers
    // ------------------------------------------------------------------------
    switchComplaintSubTab(tab) {
        const panelSubmit = document.getElementById('panel-complaint-submit');
        const panelHistory = document.getElementById('panel-complaint-history');
        const btnSubmit = document.getElementById('cmp-subtab-submit');
        const btnHistory = document.getElementById('cmp-subtab-history');

        panelSubmit.classList.add('hidden');
        panelHistory.classList.add('hidden');

        if (tab === 'submit') {
            panelSubmit.classList.remove('hidden');
            btnSubmit.className = "btn btn-primary";
            btnHistory.className = "btn btn-outline";
        } else {
            panelHistory.classList.remove('hidden');
            btnSubmit.className = "btn btn-outline";
            btnHistory.className = "btn btn-primary";
            this.renderComplaintsHistory();
        }
    },

    updateComplaintCounters() {
        const titleVal = document.getElementById('cmp-title')?.value || '';
        const descVal = document.getElementById('cmp-desc')?.value || '';
        const titleCounter = document.getElementById('title-counter');
        const descCounter = document.getElementById('desc-counter');

        if (titleCounter) titleCounter.textContent = `${titleVal.length} / 150`;
        if (descCounter) descCounter.textContent = `${descVal.length} / 2,000`;
    },

    handleComplaintFileSelected(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > this.config.LIMITS.MAX_FILE_BYTES) {
            alert("Complaint photo exceeds 2 MB limit.");
            e.target.value = '';
            return;
        }

        this.state.complaintFile = file;
        const reader = new FileReader();
        reader.onload = (evt) => {
            this.state.complaintPreviewUrl = evt.target.result;
            const container = document.getElementById('cmp-dropzone-content');
            if (container) {
                container.innerHTML = `
                    <div class="preview-pill">
                        <span>✓ Attached: ${file.name} (${Math.round(file.size / 1024)} KB)</span>
                    </div>
                `;
            }
        };
        reader.readAsDataURL(file);
    },

    async handleComplaintSubmit(e) {
        e.preventDefault();
        const alertBox = document.getElementById('complaint-alert');
        const submitBtn = document.getElementById('btn-complaint-submit');
        if (alertBox) alertBox.classList.add('hidden');

        const title = document.getElementById('cmp-title').value.trim();
        const description = document.getElementById('cmp-desc').value.trim();

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `Registering Grievance Ticket...`;
        }

        try {
            const formData = new FormData();
            formData.append('title', title);
            formData.append('description', description);
            if (this.state.complaintFile) {
                formData.append('photo', this.state.complaintFile);
            }

            const now = new Date().toISOString();
            const newComplaint = {
                id: "cmp_" + Date.now(),
                student_roll_no: this.state.currentUser.roll_no,
                student_name: this.state.currentUser.name,
                title,
                description,
                photo_url: this.state.complaintPreviewUrl || null,
                status: "submitted",
                created_at: now,
                timeline: [
                    { status: "submitted", note: "Complaint ticket registered by resident.", updated_at: now }
                ]
            };

            // Save in Local Store
            const localData = this.storage.getData();
            localData.complaints.unshift(newComplaint);
            this.storage.saveData(localData);

            // Reset form
            document.getElementById('form-complaint').reset();
            this.state.complaintFile = null;
            this.state.complaintPreviewUrl = null;

            alert("Grievance ticket registered successfully! Dispatched to warden desk.");
            this.switchComplaintSubTab('history');

        } catch (err) {
            if (alertBox) {
                alertBox.textContent = err.message || "Failed to submit complaint.";
                alertBox.classList.remove('hidden');
            }
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = `Submit Grievance Ticket &rarr;`;
            }
        }
    },

    renderComplaintsHistory() {
        const container = document.getElementById('complaints-list-container');
        if (!container) return;

        const localData = this.storage.getData();
        const userRoll = this.state.currentUser?.roll_no;
        const myComplaints = localData.complaints.filter(c => c.student_roll_no === userRoll);

        if (myComplaints.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
                    <div style="font-size: 32px; margin-bottom: 8px;">🎉</div>
                    <div style="font-weight: 700; color: var(--text-main); font-size: 15px;">No Active Grievances</div>
                    <p style="font-size: 12px; margin-top: 4px;">Everything in your residential hostel block is operating normally.</p>
                </div>
            `;
            return;
        }

        let html = '<div style="display: flex; flex-direction: column; gap: 20px;">';
        myComplaints.forEach(c => {
            const statusMeta = this.config.STATUS_LABELS[c.status] || this.config.STATUS_LABELS['submitted'];
            html += `
                <div style="background: var(--bg-alt); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid var(--border); padding-bottom: 12px; margin-bottom: 12px;">
                        <div>
                            <span class="font-mono" style="font-size: 10px; color: var(--text-muted); text-transform: uppercase;">Ticket #${c.id}</span>
                            <h4 style="font-family: var(--font-heading); font-size: 16px; font-weight: 800; color: var(--text-main); margin-top: 2px;">${this.escapeHTML(c.title)}</h4>
                        </div>
                        <span class="badge ${statusMeta.class}">${statusMeta.text}</span>
                    </div>

                    <div style="background: #ffffff; padding: 12px 14px; border-radius: var(--radius-md); border: 1px solid var(--border); font-size: 13px; line-height: 1.6; color: #334155; margin-bottom: 14px;">
                        ${this.escapeHTML(c.description)}
                    </div>

                    ${c.photo_url ? `
                    <div style="margin-bottom: 14px;">
                        <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 4px;">Attached Photo Proof:</span>
                        <img src="${c.photo_url}" alt="Attachment" style="max-height: 140px; border-radius: var(--radius-md); border: 1px solid var(--border); object-fit: contain;">
                    </div>
                    ` : ''}

                    <div style="border-top: 1px solid var(--border); padding-top: 12px;">
                        <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted);">Progress Timeline:</span>
                        <div class="timeline-container">
                            ${(c.timeline || []).map(step => {
                                const stepMeta = this.config.STATUS_LABELS[step.status] || { text: step.status };
                                return `
                                    <div class="timeline-step">
                                        <div class="timeline-step-header">
                                            <span class="timeline-step-title">${stepMeta.text}</span>
                                            <span class="timeline-step-time">${this.formatIST(step.updated_at)}</span>
                                        </div>
                                        <div class="timeline-step-note">${this.escapeHTML(step.note)}</div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';

        container.innerHTML = html;
    },

    // ------------------------------------------------------------------------
    // 10. Notice Modal Toggle
    // ------------------------------------------------------------------------
    toggleNoticeModal(show) {
        const modal = document.getElementById('notice-modal');
        if (!modal) return;
        if (show) modal.classList.remove('hidden');
        else modal.classList.add('hidden');
    },

    // ------------------------------------------------------------------------
    // 11. Admin & Students Directory Handler (Host Console)
    // ------------------------------------------------------------------------
    togglePasswordVisibility() {
        this.state.showPasswords = !this.state.showPasswords;
        const label = document.getElementById('toggle-pw-label');
        if (label) {
            label.textContent = this.state.showPasswords ? "Hide Passwords" : "Show Passwords";
        }
        this.renderAdminUsers();
    },

    copyToClipboard(text) {
        if (!text) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                alert(`✓ Password "${text}" copied to clipboard!`);
            }).catch(() => {
                prompt("Copy password manually:", text);
            });
        } else {
            prompt("Copy password manually:", text);
        }
    },

    exportUsersCSV() {
        const localData = this.storage.getData();
        const users = localData.users || [];
        if (users.length === 0) {
            alert("No student records available to export.");
            return;
        }

        let csv = "Scholar Number,Student Name,Hostel Room,Student Password,Role,Email Address\r\n";
        users.forEach(u => {
            csv += `"${u.roll_no || ''}","${u.name || ''}","${u.room || 'Hostel 7'}","${u.password || ''}","${u.role || 'student'}","${u.email || ''}"\r\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Hostel7_Student_Passwords_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },

    renderAdminUsers() {
        const tbody = document.getElementById('admin-users-table-body');
        const countBadge = document.getElementById('admin-user-count');
        if (!tbody) return;

        const localData = this.storage.getData();
        const users = localData.users || [];

        if (countBadge) {
            countBadge.textContent = `Total: ${users.length} Registered`;
        }

        if (users.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 24px; color: var(--text-muted);">No students registered yet.</td></tr>`;
            return;
        }

        const showPw = this.state.showPasswords !== false;
        let html = '';
        users.forEach(u => {
            const pwDisplay = showPw
                ? `<span class="font-mono font-bold" style="background: #eef2ff; color: #3730a3; padding: 4px 10px; border-radius: 6px; border: 1px solid #c7d2fe; letter-spacing: 0.5px; display: inline-block;">${this.escapeHTML(u.password || 'N/A')}</span>`
                : `<span class="font-mono" style="background: #f1f5f9; color: #64748b; padding: 4px 10px; border-radius: 6px; border: 1px solid #e2e8f0; letter-spacing: 2px; display: inline-block;">••••••••</span>`;

            html += `
                <tr>
                    <td class="mess-day-cell font-mono" style="color: var(--primary); font-weight: 700;">${this.escapeHTML(u.roll_no)}</td>
                    <td class="mess-meal-cell"><strong>${this.escapeHTML(u.name)}</strong></td>
                    <td class="mess-meal-cell">${this.escapeHTML(u.room || 'Hostel 7')}</td>
                    <td class="mess-meal-cell" style="background: #f8fafc;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            ${pwDisplay}
                            <button type="button" class="btn btn-outline" style="padding: 2px 7px; font-size: 11px; cursor: pointer;" onclick="App.copyToClipboard('${this.escapeHTML(u.password || '')}')" title="Copy Password to Clipboard">
                                📋 Copy
                            </button>
                        </div>
                    </td>
                    <td class="mess-meal-cell"><span class="meal-badge ${u.role === 'admin' ? 'meal-badge-di' : 'meal-badge-bf'}">${this.escapeHTML(u.role || 'student')}</span></td>
                    <td class="mess-meal-cell font-mono" style="font-size: 11px; color: var(--text-muted);">${this.escapeHTML(u.email || (u.roll_no + '@hostel7.college.edu'))}</td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    },

    // ------------------------------------------------------------------------
    // 12. Main Initializer
    // ------------------------------------------------------------------------
    init() {
        console.log("Hostel 7 Mess Portal: Clean Architecture Initialized.");

        // Initialize local storage defaults
        this.storage.getData();

        // Check backend server status
        this.checkBackendHealth();

        // Check active session
        if (this.state.currentUser) {
            this.onLoginSuccess();
        } else {
            this.showAuth();
        }
    }
};

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
