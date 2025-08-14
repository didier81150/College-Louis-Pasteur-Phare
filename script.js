// Configuration
const APP_CONFIG = {};

// Utilitaires de chiffrement
function encryptData(data, key) {
    if (!key) {
        console.error("Tentative de chiffrement sans clé.");
        return null;
    }
    return CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();
}

function decryptData(encryptedData, key) {
    if (!encryptedData || !key) return null;
    try {
        const bytes = CryptoJS.AES.decrypt(encryptedData, key);
        const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
        if (!decryptedString) {
            return null;
        }
        return JSON.parse(decryptedString);
    } catch (e) {
        console.error("Erreur de déchiffrement:", e);
        return null;
    }
}

// Gestion des pages
class PageManager {
    constructor() {
        this.currentPage = 'homePage';
        this.initializeEventListeners();
        this.loadLogo();
    }

    showPage(pageId) {
        document.querySelectorAll('[id$="Page"], #adminPanel, #studentManagement').forEach(page => {
            page.classList.add('hidden');
        });
        const page = document.getElementById(pageId);
        if (page) {
            page.classList.remove('hidden');
        }
        this.currentPage = pageId;
    }

    initializeEventListeners() {
        document.getElementById('studentLoginBtn')?.addEventListener('click', () => this.showPage('studentLoginPage'));
        document.getElementById('adminLoginBtn')?.addEventListener('click', () => this.showPage('adminLoginPage'));
        document.getElementById('alreadyRegisteredBtn')?.addEventListener('click', () => this.showPage('studentLoginPage'));
        document.getElementById('backToHomeBtn')?.addEventListener('click', () => this.showPage('homePage'));
        document.getElementById('backToHomeFromLoginBtn')?.addEventListener('click', () => {
            this.resetLoginForm();
            this.showPage('homePage');
        });
        document.getElementById('backToHomeFromAdminBtn')?.addEventListener('click', () => this.showPage('homePage'));
        document.getElementById('manageStudentsBtn')?.addEventListener('click', () => {
            this.showPage('studentManagement');
            if (window.studentManager) {
                studentManager.renderTable();
                studentManager.updateStatistics();
            }
        });
        document.getElementById('backToAdminBtn')?.addEventListener('click', () => {
            this.showPage('adminPanel');
            if (window.reportSystem) {
                reportSystem.updateAdminDisplay();
            }
        });
        document.getElementById('studentLogoutBtn')?.addEventListener('click', () => this.showPage('homePage'));
        document.getElementById('adminLogoutBtn')?.addEventListener('click', () => {
            if (window.adminAuth) adminAuth.logout();
        });
        document.getElementById('logoUpload')?.addEventListener('change', (e) => this.handleLogoUpload(e));
    }

    loadLogo() {
        const savedLogo = localStorage.getItem('collegeLogo');
        if (savedLogo) {
            const logoImage = document.getElementById('logoImage');
            const defaultLogo = document.getElementById('defaultLogo');
            if (logoImage && defaultLogo) {
                logoImage.src = savedLogo;
                logoImage.classList.remove('hidden');
                defaultLogo.classList.add('hidden');
            }
        }
    }

    handleLogoUpload(event) {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const logoData = e.target.result;
                localStorage.setItem('collegeLogo', logoData);
                this.loadLogo();
                this.showNotification('Logo mis à jour avec succès', 'success');
            };
            reader.readAsDataURL(file);
        }
    }

    resetLoginForm() {
        const loginForm = document.getElementById('studentLoginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                if (window.studentAuth) {
                    studentAuth.handleLogin(e);
                }
            });
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg text-white z-50 fade-in`;
        if (type === 'success') notification.classList.add('bg-green-500');
        else if (type === 'error') notification.classList.add('bg-red-500');
        else notification.classList.add('bg-blue-500');
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Système d'authentification des élèves
class StudentAuth {
    constructor() {
        this.currentStudent = null;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        document.getElementById('studentRegisterForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.showMessage('registerMessage', "L'auto-inscription n'est plus disponible. Veuillez contacter un administrateur.", 'error');
        });
        document.getElementById('studentLoginForm')?.addEventListener('submit', (e) => this.handleLogin(e));
    }

    handleLogin(e) {
        e.preventDefault();
        const studentId = document.getElementById('loginStudentId').value.toLowerCase();
        const password = document.getElementById('loginPassword').value;

        if (!window.studentManager) {
            this.showMessage('loginMessage', 'Le système de gestion des élèves n\'est pas initialisé.', 'error');
            return;
        }

        const studentInDB = studentManager.students.find(s => s.id === studentId);

        if (!studentInDB) {
            this.showMessage('loginMessage', 'Identifiant ou mot de passe incorrect.', 'error');
            return;
        }

        if (studentInDB.secretCode) {
            const passwordHash = CryptoJS.SHA256(password).toString();
            if (passwordHash === studentInDB.secretCode) {
                this.currentStudent = studentInDB;
                pageManager.showPage('studentReportPage');
            } else {
                this.showMessage('loginMessage', 'Identifiant ou mot de passe incorrect.', 'error');
            }
            return;
        }

        if (password === studentInDB.password) {
            this.showSecretCodeCreation(studentId, studentInDB);
        } else {
            this.showMessage('loginMessage', 'Identifiant ou mot de passe incorrect.', 'error');
        }
    }

    generateSecretCode() {
        const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    showSecretCodeCreation(studentId, studentInDB) {
        const secretCode = this.generateSecretCode();
        const loginForm = document.getElementById('studentLoginForm');
        loginForm.innerHTML = `
            <div class="text-center mb-6">
                <div class="bg-green-100 p-4 rounded-lg mb-4">
                    <h3 class="font-bold text-green-800 mb-2">🎉 Première connexion réussie !</h3>
                    <p class="text-green-700 text-sm">Votre code secret personnel a été généré</p>
                </div>
                <div class="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
                    <p class="text-blue-800 font-semibold mb-2">Votre code secret :</p>
                    <div class="text-3xl font-mono font-bold text-blue-900 bg-white p-4 rounded border-2 border-blue-300 tracking-widest">${secretCode}</div>
                    <p class="text-blue-700 text-sm mt-3"><strong>IMPORTANT :</strong> Mémorisez ce code ! Vous en aurez besoin pour vos prochaines connexions.</p>
                </div>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Pour confirmer, ressaisissez votre code secret :</label>
                <input type="text" id="confirmSecretCode" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-center font-mono text-lg tracking-widest" placeholder="Saisissez le code" maxlength="6" style="text-transform: uppercase;" required>
            </div>
            <button type="button" id="confirmCodeBtn" class="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-4 rounded-lg">Confirmer et continuer</button>
        `;
        document.getElementById('confirmCodeBtn').addEventListener('click', () => this.confirmSecretCode(studentId, studentInDB, secretCode));
        document.getElementById('confirmSecretCode').addEventListener('input', (e) => e.target.value = e.target.value.toUpperCase());
    }

    confirmSecretCode(studentId, studentInDB, originalSecretCode) {
        const enteredCode = document.getElementById('confirmSecretCode').value.toUpperCase();
        if (enteredCode !== originalSecretCode) {
            this.showMessage('loginMessage', 'Le code saisi ne correspond pas. Veuillez réessayer.', 'error');
            return;
        }
        studentInDB.secretCode = CryptoJS.SHA256(originalSecretCode).toString();
        studentInDB.password = 'USED';
        studentManager.saveStudents();
        this.currentStudent = studentInDB;
        this.showMessage('loginMessage', `✅ Parfait ! Votre code secret est maintenant enregistré.`, 'success');
        setTimeout(() => pageManager.showPage('studentReportPage'), 2000);
    }

    showMessage(elementId, message, type) {
        const element = document.getElementById(elementId);
        if (!element) return;
        element.textContent = message;
        element.className = `mt-4 p-3 rounded-lg text-center ${type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`;
        element.classList.remove('hidden');
        setTimeout(() => element.classList.add('hidden'), 5000);
    }
}

// Gestion des élèves (Admin)
class StudentManager {
    constructor() {
        this.students = [];
        this.selectedRow = null;
        this.initializeEventListeners();
    }

    loadStudents() {
        const encrypted = localStorage.getItem('studentDatabase_encrypted');
        const decrypted = decryptData(encrypted, adminAuth.masterKey);
        this.students = decrypted || [];
    }

    saveStudents() {
        const encrypted = encryptData(this.students, adminAuth.masterKey);
        if (encrypted) {
            localStorage.setItem('studentDatabase_encrypted', encrypted);
        }
    }

    initializeEventListeners() {
        document.getElementById('addRowBtn')?.addEventListener('click', () => this.addStudent());
        document.getElementById('deleteRowBtn')?.addEventListener('click', () => this.deleteSelectedStudent());
        document.getElementById('generatePasswordBtn')?.addEventListener('click', () => this.generateAllPasswords());
        document.getElementById('exportStudentsBtn')?.addEventListener('click', () => this.exportToCSV());
        document.getElementById('importStudentsBtn')?.addEventListener('click', () => document.getElementById('fileInput')?.click());
        document.getElementById('fileInput')?.addEventListener('change', (e) => this.importFromCSV(e));
    }

    addStudent() {
        const newStudent = { id: '', class: '', password: this.generatePassword(), secretCode: '' };
        this.students.push(newStudent);
        this.saveStudents();
        this.renderTable();
        this.updateStatistics();
        pageManager.showNotification('Nouvel élève ajouté avec un mot de passe provisoire.', 'success');
    }

    deleteStudent(index) {
        if (confirm('Êtes-vous sûr de vouloir supprimer cet élève ?')) {
            this.students.splice(index, 1);
            this.saveStudents();
            this.renderTable();
            this.updateStatistics();
            pageManager.showNotification('Élève supprimé', 'success');
        }
    }

    deleteSelectedStudent() {
        if (!this.selectedRow) {
            pageManager.showNotification('Veuillez sélectionner une ligne à supprimer', 'error');
            return;
        }
        const index = parseInt(this.selectedRow.dataset.index);
        this.deleteStudent(index);
    }
    
    updateStudent(index, field, value) {
        if (this.students[index]) {
            this.students[index][field] = value.toLowerCase().trim();
            this.saveStudents();
            this.updateStatistics();
        }
    }

    generatePassword() {
        const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
        let password = '';
        for (let i = 0; i < 8; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    }

    generateAllPasswords() {
        if (confirm('Générer de nouveaux mots de passe pour tous les élèves ?')) {
            this.students.forEach(student => {
                if (student.password !== 'USED') {
                    student.password = this.generatePassword();
                }
            });
            this.saveStudents();
            this.renderTable();
            pageManager.showNotification('Mots de passe régénérés', 'success');
        }
    }

    renderTable() {
        const tbody = document.getElementById('tableBody');
        if (!tbody) return;
        tbody.innerHTML = '';
        this.students.forEach((student, index) => {
            const row = this.createStudentRow(student, index);
            tbody.appendChild(row);
        });
        this.updateStudentCount();
    }

    createStudentRow(student, index) {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        row.dataset.index = index;
        row.addEventListener('click', () => this.selectRow(row));
        row.innerHTML = `
            <td class="excel-cell row-number">${index + 1}</td>
            <td class="excel-cell"><input type="text" value="${student.id}" class="w-full border-none bg-transparent focus:outline-none" onchange="studentManager.updateStudent(${index}, 'id', this.value)"></td>
            <td class="excel-cell"><select class="w-full border-none bg-transparent focus:outline-none" onchange="studentManager.updateStudent(${index}, 'class', this.value)">${this.getClassOptions(student.class)}</select></td>
            <td class="excel-cell"><input type="text" value="${student.password}" class="w-full border-none bg-transparent font-mono" onchange="studentManager.updateStudent(${index}, 'password', this.value)"></td>
            <td class="excel-cell"><input type="text" value="${student.secretCode ? 'Oui' : 'Non'}" class="w-full border-none bg-transparent font-mono" readonly></td>
            <td class="excel-cell">${this.getStudentReportsCount(student.id)}</td>
            <td class="excel-cell text-center"><button onclick="studentManager.deleteStudent(${index})" class="text-red-600 hover:text-red-800">🗑️</button></td>
        `;
        return row;
    }
    
    getClassOptions(selectedClass) {
        const levels = ['6', '5', '4', '3'];
        let options = '<option value="">Classe</option>';
        levels.forEach(level => {
            for (let i = 1; i <= 9; i++) {
                const className = `${level}G${i}`;
                options += `<option value="${className}" ${selectedClass === className ? 'selected' : ''}>${className}</option>`;
            }
        });
        return options;
    }

    selectRow(row) {
        if (this.selectedRow) {
            this.selectedRow.classList.remove('selected-row');
        }
        row.classList.add('selected-row');
        this.selectedRow = row;
    }

    updateStudentCount() {
        const studentCount = document.getElementById('studentCount');
        if(studentCount) studentCount.textContent = this.students.length;
    }

    updateStatistics() {
        const stats = { '6': 0, '5': 0, '4': 0, '3': 0 };
        this.students.forEach(student => {
            const level = student.class.charAt(0);
            if (stats.hasOwnProperty(level)) stats[level]++;
        });
        document.getElementById('count6').textContent = stats['6'];
        document.getElementById('count5').textContent = stats['5'];
        document.getElementById('count4').textContent = stats['4'];
        document.getElementById('count3').textContent = stats['3'];
    }

    getStudentReportsCount(studentId) {
        return window.reportSystem?.reports.filter(report => report.studentId === studentId).length || 0;
    }

    // ... (other methods like exportToCSV, importFromCSV are unchanged)
    exportToCSV() { /* ... */ }
    importFromCSV(event) { /* ... */ }
}

// Système de signalement
class ReportSystem {
    constructor() {
        this.reports = [];
        this.config = {};
    }

    loadData() {
        const reportsEncrypted = localStorage.getItem('encryptedReports');
        const configEncrypted = localStorage.getItem('pharConfig_encrypted');
        this.reports = decryptData(reportsEncrypted, adminAuth.masterKey) || [];
        this.config = decryptData(configEncrypted, adminAuth.masterKey) || {};
        this.initializeEventListeners();
    }

    saveReports() {
        const encrypted = encryptData(this.reports, adminAuth.masterKey);
        if (encrypted) localStorage.setItem('encryptedReports', encrypted);
    }
    
    saveConfig() {
        const encrypted = encryptData(this.config, adminAuth.masterKey);
        if (encrypted) localStorage.setItem('pharConfig_encrypted', encrypted);
    }

    initializeEventListeners() {
        // ... (event listeners are unchanged)
    }

    // ... (all other methods are unchanged)
}

// Authentification admin
class AdminAuth {
    constructor() {
        this.masterKey = null;
        this.masterPasswordHash = localStorage.getItem('masterPasswordHash');
        this.initializeEventListeners();
        this.checkSetup();
    }

    checkSetup() {
        const loginContainer = document.getElementById('adminLoginContainer');
        const setupContainer = document.getElementById('adminSetupContainer');
        if (this.masterPasswordHash) {
            loginContainer?.classList.remove('hidden');
            setupContainer?.classList.add('hidden');
        } else {
            loginContainer?.classList.add('hidden');
            setupContainer?.classList.remove('hidden');
        }
    }

    initializeEventListeners() {
        document.getElementById('loginAdminBtn')?.addEventListener('click', () => this.handleLogin());
        document.getElementById('adminCode')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });
        document.getElementById('setupAdminBtn')?.addEventListener('click', () => this.handleSetup());
    }

    handleSetup() {
        const newPassword = document.getElementById('newMasterPassword').value;
        const confirmPassword = document.getElementById('confirmMasterPassword').value;
        const errorDiv = document.getElementById('adminSetupError');

        if (newPassword.length < 8) {
            errorDiv.textContent = 'Le mot de passe doit faire au moins 8 caractères.';
            errorDiv.classList.remove('hidden');
            return;
        }
        if (newPassword !== confirmPassword) {
            errorDiv.textContent = 'Les mots de passe ne correspondent pas.';
            errorDiv.classList.remove('hidden');
            return;
        }

        this.masterPasswordHash = CryptoJS.SHA256(newPassword).toString();
        localStorage.setItem('masterPasswordHash', this.masterPasswordHash);
        this.masterKey = newPassword;
        
        // Load data with the new key
        studentManager.loadStudents();
        reportSystem.loadData();

        pageManager.showNotification('Configuration réussie !', 'success');
        pageManager.showPage('adminPanel');
        reportSystem.updateAdminDisplay();
    }

    handleLogin() {
        const inputCode = document.getElementById('adminCode').value;
        const errorDiv = document.getElementById('adminLoginError');
        const inputHash = CryptoJS.SHA256(inputCode).toString();

        if (inputHash === this.masterPasswordHash) {
            this.masterKey = inputCode;
            
            // Load all encrypted data
            studentManager.loadStudents();
            reportSystem.loadData();
            
            pageManager.showPage('adminPanel');
            reportSystem.updateAdminDisplay();
            document.getElementById('adminCode').value = '';
            errorDiv.classList.add('hidden');
        } else {
            errorDiv.textContent = 'Mot de passe incorrect.';
            errorDiv.classList.remove('hidden');
        }
    }

    logout() {
        // this.masterKey = null; // Important: Do not nullify key to allow student login in the same session
        pageManager.showPage('homePage');
    }
}

// Initialisation
let pageManager, studentAuth, reportSystem, adminAuth, studentManager;

document.addEventListener('DOMContentLoaded', function() {
    try {
        pageManager = new PageManager();
        adminAuth = new AdminAuth();
        studentManager = new StudentManager();
        studentAuth = new StudentAuth();
        reportSystem = new ReportSystem();
        
        window.pageManager = pageManager;
        window.adminAuth = adminAuth;
        window.studentManager = studentManager;
        window.studentAuth = studentAuth;
        window.reportSystem = reportSystem;
        
    } catch (error) {
        console.error('Erreur critique lors de l\'initialisation:', error);
        document.body.innerHTML = "Une erreur critique est survenue. L'application ne peut pas démarrer.";
    }
});
