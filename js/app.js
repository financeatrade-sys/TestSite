// js/app.js

// 
// ========================================================
// APP LOGIC START: توفير وظائف مساعدة عامة
// هذا الجزء يحتوي على أدوات ووظائف مساعدة سنستخدمها في كل مكان.
// ========================================================
// 

/**
 * دالة بسيطة لتوليد كود إحالة (Referral Code) فريد وعشوائي.
 * @returns {string} كود مكون من 6 حروف وأرقام كبيرة.
 */
function generateReferralCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/**
 * دالة لعرض رسائل الأخطاء على واجهة المستخدم.
 * @param {string} message - رسالة الخطأ المراد عرضها.
 * @param {string} elementId - ID العنصر الذي سيعرض الرسالة (عادةً 'authError').
 */
function displayError(message, elementId = 'authError') {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        setTimeout(() => {
            errorElement.textContent = ''; // مسح الرسالة بعد 5 ثوانٍ
        }, 5000);
    }
}

// 
// ========================================================
// APP LOGIC END: توفير وظائف مساعدة عامة
// ========================================================
// 

// 
// ========================================================
// 4. وظيفة التوجيه المعقدة (ROLE-BASED REDIRECTION)
// هذه هي الوظيفة المركزية التي تدير توجيه المستخدمين بعد الدخول.
// ========================================================
// 

/**
 * توجيه المستخدم إلى الصفحة الصحيحة بناءً على دوره.
 * يتم استدعاء هذه الدالة بعد نجاح المصادقة أو التحقق من الحالة.
 * @param {string} uid - مُعرّف المستخدم في Firebase.
 */
async function redirectToDashboard(uid) {
    try {
        const userDoc = await db.collection('users').doc(uid).get();

        if (!userDoc.exists) {
            // هذا يحدث للمستخدمين الجدد الذين سجلوا عبر جوجل ولم يكملوا بياناتهم.
            console.log("User document does not exist, redirecting to Onboarding.");
            return window.location.href = 'onboarding.html';
        }

        const userData = userDoc.data();
        const role = userData.role || 'user'; // الدور الافتراضي هو 'user'

        // التوجيه بناءً على الدور
        switch (role) {
            case 'admin':
                window.location.href = 'admin-dash.html';
                break;
            case 'moderator':
                window.location.href = 'moderator-dash.html';
                break;
            case 'author':
                window.location.href = 'author-dash.html';
                break;
            case 'user':
            default:
                window.location.href = 'dashboard.html';
                break;
        }

    } catch (error) {
        console.error("Error redirecting user:", error);
        // في حالة الفشل، توجه إلى صفحة عامة بأقل الصلاحيات
        window.location.href = 'dashboard.html';
    }
}

// 
// ========================================================
// 5. التحقق من حالة المصادقة (Auth State Listener)
// هذه الوظيفة تعمل على كل صفحة (باستثناء home.html و auth.html)
// لضمان بقاء المستخدم في حالة تسجيل الدخول الصحيحة.
// ========================================================
// 

// يعمل المستمع هذا على كل تحميل صفحة
auth.onAuthStateChanged(user => {
    const currentPage = window.location.pathname;

    if (user) {
        // المستخدم مسجل دخوله
        if (currentPage.includes('auth.html') || currentPage === '/') {
            // إذا كان المستخدم مسجل دخوله وحاول زيارة auth.html، يتم توجيهه
            redirectToDashboard(user.uid);
        } else if (currentPage.includes('onboarding.html')) {
            // إذا كان في صفحة Onboarding، نتأكد من أنه لم يكمل ملفه الشخصي بعد
            // (التحقق الفعلي يتم داخل كود Onboarding)
            // نتركه يكمل البيانات
            return;
        }
        // في الصفحات الداخلية (dashboard, market, learning)
        // لا نفعل شيئاً ونتركه يواصل، لكنه محمي بالمنطق أعلاه.

    } else {
        // المستخدم غير مسجل دخوله
        if (currentPage.includes('dashboard.html') || 
            currentPage.includes('admin-dash.html') || 
            currentPage.includes('moderator-dash.html') || 
            currentPage.includes('author-dash.html') || 
            currentPage.includes('onboarding.html')) {
            
            // إذا حاول الوصول لصفحة محمية، يتم إرساله إلى صفحة الدخول
            window.location.href = 'auth.html';
        }
        // إذا كان في home.html أو market.html أو learning.html، يبقى هناك (لأنها صفحات عامة)
    }
});


// 
// ========================================================
// 6. وظائف المصادقة الخاصة بـ auth.html
// يتم تفعيل هذه الوظائف فقط عند تحميل صفحة auth.html
// ========================================================
// 
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
    // تأكد من أننا في صفحة auth.html قبل محاولة إرفاق المستمعين
    if (loginForm && signupForm) {

        // ====================================================
        // أ. التسجيل التقليدي (Email/Password)
        // ====================================================
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;
            const fullName = document.getElementById('fullName').value;
            const username = document.getElementById('username').value;
            const country = document.getElementById('country').value;
            const referralCode = document.getElementById('referralCode').value;

            // 1. التحقق من تفرد اسم المستخدم (مهم جداً قبل إنشاء حساب Firebase)
            const usernameExists = await db.collection('users').where('username', '==', username).limit(1).get();
            if (!usernameExists.empty) {
                return displayError("Error: This username is already taken. Please choose another one.", 'authError');
            }

            try {
                // 2. إنشاء حساب Firebase
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                const user = userCredential.user;

                // 3. إنشاء وثيقة المستخدم في Firestore
                await db.collection('users').doc(user.uid).set({
                    email: email,
                    username: username,
                    fullName: fullName,
                    country: country,
                    role: 'user', // الدور الافتراضي
                    balance: 0,
                    points: 0,
                    reservedForOffers: 0,
                    pointsPendingPool: 0,
                    primeLevel: 0,
                    stakedAmount: 0,
                    referralCode: generateReferralCode(), // توليد كود فريد له
                    referredBy: referralCode || null, // كود المُحيل الذي استخدمه
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                // 4. التوجيه
                redirectToDashboard(user.uid);

            } catch (error) {
                console.error("Signup Error:", error);
                displayError(`Signup failed: ${error.message}`, 'authError');
            }
        });


        // ====================================================
        // ب. تسجيل الدخول التقليدي
        // ====================================================
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;

            try {
                const userCredential = await auth.signInWithEmailAndPassword(email, password);
                const user = userCredential.user;
                
                // التوجيه
                redirectToDashboard(user.uid);

            } catch (error) {
                console.error("Login Error:", error);
                displayError(`Login failed: ${error.message}`, 'authError');
            }
        });
        
        
        // ====================================================
        // ج. المصادقة عبر جوجل (Login/Signup with Google)
        // ====================================================
        const googleProvider = new firebase.auth.GoogleAuthProvider();

        const handleGoogleAuth = async () => {
            try {
                const result = await auth.signInWithPopup(googleProvider);
                const user = result.user;
                
                // 1. التحقق مما إذا كان المستخدم موجوداً في Firestore
                const userDoc = await db.collection('users').doc(user.uid).get();

                if (!userDoc.exists) {
                    // 2. إذا كان المستخدم جديداً (سجل عبر جوجل)، نرسله إلى صفحة إكمال البيانات
                    // سنقوم بحفظ البيانات الأساسية (الاسم والبريد) مؤقتاً في LocalStorage
                    localStorage.setItem('tempFullName', user.displayName);
                    localStorage.setItem('tempEmail', user.email);

                    // التوجيه إلى Onboarding
                    window.location.href = 'onboarding.html';
                } else {
                    // 3. إذا كان المستخدم قديماً وكامل البيانات، يتم توجيهه مباشرة
                    redirectToDashboard(user.uid);
                }

            } catch (error) {
                console.error("Google Auth Error:", error);
                displayError(`Google sign-in failed: ${error.message}`, 'authError');
            }
        };

        // إرفاق مستمعي الأزرار
        document.getElementById('googleLoginBtn').addEventListener('click', handleGoogleAuth);
        document.getElementById('googleSignupBtn').addEventListener('click', handleGoogleAuth);
        
    }
});
// 
// ========================================================
// 7. وظيفة إكمال التسجيل (ONBOARDING LOGIC)
// يتم تفعيل هذه الوظيفة فقط عند تحميل صفحة onboarding.html
// ========================================================
// 
document.addEventListener('DOMContentLoaded', () => {
    const onboardingForm = document.getElementById('onboardingForm');
    
    // تأكد من أننا في صفحة onboarding.html قبل المتابعة
    if (onboardingForm) {
        
        // التحقق من حالة المستخدم عند تحميل الصفحة
        auth.onAuthStateChanged(async (user) => {
            if (!user) {
                // لا يوجد مستخدم، توجيه إلى صفحة الدخول
                return window.location.href = 'auth.html';
            }
            
            // قراءة البيانات الأساسية المحفوظة مؤقتاً
            const tempFullName = localStorage.getItem('tempFullName');
            const tempEmail = localStorage.getItem('tempEmail');

            // إذا كانت البيانات المؤقتة غير موجودة، يتم جلب الاسم والبريد من Firebase مباشرة
            const userFullName = tempFullName || user.displayName || 'Unnamed User';
            const userEmail = tempEmail || user.email;

            // يمكنك هنا عرض رسالة ترحيبية باسم المستخدم
            console.log(`Welcome back, ${userFullName}. Please complete your profile.`);
            
            // ====================================================
            // أ. معالجة إرسال نموذج Onboarding
            // ====================================================
            onboardingForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                const username = document.getElementById('onboardingUsername').value;
                const country = document.getElementById('onboardingCountry').value;
                const referralCode = document.getElementById('onboardingReferralCode').value;

                // 1. التحقق من تفرد اسم المستخدم
                const usernameExists = await db.collection('users').where('username', '==', username).limit(1).get();
                if (!usernameExists.empty) {
                    return displayError("Error: This username is already taken. Please choose another one.", 'onboardingError');
                }
                
                try {
                    // 2. إنشاء وثيقة المستخدم في Firestore
                    await db.collection('users').doc(user.uid).set({
                        email: userEmail,
                        username: username,
                        fullName: userFullName,
                        country: country,
                        role: 'user', // الدور الافتراضي
                        balance: 0,
                        points: 0,
                        reservedForOffers: 0,
                        pointsPendingPool: 0,
                        primeLevel: 0,
                        stakedAmount: 0,
                        referralCode: generateReferralCode(), // توليد كود فريد له
                        referredBy: referralCode || null, // كود المُحيل الذي استخدمه
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    // 3. مسح البيانات المؤقتة والتوجيه
                    localStorage.removeItem('tempFullName');
                    localStorage.removeItem('tempEmail');
                    
                    redirectToDashboard(user.uid);

                } catch (error) {
                    console.error("Onboarding Completion Error:", error);
                    displayError(`Profile update failed: ${error.message}`, 'onboardingError');
                }
            });
        });
    }
});

// 
// ========================================================
// 8. وظائف مساعدة خاصة بلوحة التحكم
// ========================================================
// 

/**
 * دالة بسيطة لنسخ نص من حقل إدخال (Input Field) إلى الحافظة.
 * @param {string} targetId - ID حقل الإدخال الذي نريد نسخ محتواه.
 */
function copyToClipboard(targetId) {
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
        targetElement.select(); // تحديد النص في الحقل
        targetElement.setSelectionRange(0, 99999); // لتحديد النص على جميع المتصفحات
        document.execCommand("copy"); // تنفيذ أمر النسخ
        alert(`Copied to clipboard: ${targetElement.value}`);
    }
}

/**
 * دالة لتهيئة وعرض بيانات الأرباح من الإحالة في الجدول.
 * @param {string} referrerId - UID المستخدم المُحيل الحالي.
 */
async function loadReferralEarnings(referrerId) {
    const tableBody = document.querySelector('#referralsTable tbody');
    const noReferralsMsg = document.getElementById('noReferralsMsg');
    
    // 1. جلب سجلات أرباح الإحالة
    const earningsSnapshot = await db.collection('referral_earnings')
                                    .where('referrerId', '==', referrerId)
                                    .orderBy('timestamp', 'desc')
                                    .get();
    
    tableBody.innerHTML = ''; // مسح المحتوى القديم
    
    if (earningsSnapshot.empty) {
        noReferralsMsg.classList.remove('hidden');
        return;
    }

    noReferralsMsg.classList.add('hidden');
    
    // 2. تجميع الأرباح حسب اسم المستخدم المُحال (لتجميع المعاملات المتعددة)
    const aggregatedEarnings = {};
    earningsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const username = data.referredUsername;
        
        if (!aggregatedEarnings[username]) {
            aggregatedEarnings[username] = { 
                totalPoints: 0, 
                joinDate: data.timestamp // نستخدم تاريخ أول ربح كتقريب لتاريخ الانضمام
            };
        }
        aggregatedEarnings[username].totalPoints += data.amountEarned;
    });

    // 3. ملء الجدول
    for (const username in aggregatedEarnings) {
        const data = aggregatedEarnings[username];
        const date = data.joinDate ? data.joinDate.toDate().toLocaleDateString() : 'N/A';
        
        const row = tableBody.insertRow();
        row.insertCell(0).textContent = username;
        row.insertCell(1).textContent = data.totalPoints.toLocaleString();
        row.insertCell(2).textContent = date;
    }
}

// 
// ========================================================
// 9. وظيفة تحميل بيانات لوحة التحكم الرئيسية
// ========================================================
// 

async function loadDashboardData(uid) {
    try {
        // 1. جلب وثيقة المستخدم
        const userDoc = await db.collection('users').doc(uid).get();
        if (!userDoc.exists) {
            console.error("User profile data not found.");
            // تسجيل الخروج التلقائي أو التوجيه لصفحة خطأ
            auth.signOut();
            return;
        }

        const data = userDoc.data();
        
        // 2. تحديث قسم التحية وشريط التنقل
        document.getElementById('userGreeting').textContent = `Hello, ${data.username || data.fullName}!`;
        
        // 3. تحديث بطاقة الأرصدة (A)
        document.getElementById('currentBalance').textContent = `$${(data.balance || 0).toFixed(2)}`;
        document.getElementById('reservedOffers').textContent = `$${(data.reservedForOffers || 0).toFixed(2)}`;
        document.getElementById('currentPoints').textContent = (data.points || 0).toLocaleString();

        // 4. تحديث قسم Staking (B)
        document.getElementById('primeLevel').textContent = data.primeLevel || 0;
        document.getElementById('stakedAmount').textContent = `$${(data.stakedAmount || 0).toFixed(2)}`;
        
        // منطق عرض تاريخ فك التخزين
        const unstakeStatusElement = document.getElementById('unstakeStatus');
        if (data.unstakeRequestDate) {
            unstakeStatusElement.classList.remove('hidden');
            const date = data.unstakeRequestDate.toDate().toLocaleDateString();
            document.getElementById('unstakeDate').textContent = date;
        } else {
            unstakeStatusElement.classList.add('hidden');
        }

        // 5. تحديث قسم الإحالة (C)
        const referralCode = data.referralCode || generateReferralCode();
        const referralLink = `https://tokenyouown.com/auth.html?ref=${referralCode}`;
        
        document.getElementById('myReferralCode').value = referralCode;
        document.getElementById('myReferralLink').value = referralLink;
        document.getElementById('totalRefEarnings').textContent = (data.totalReferralEarnings || 0).toLocaleString(); // يجب إضافة هذا الحقل لاحقاً في Firestore
        
        // تحميل بيانات الجدول التفصيلي
        await loadReferralEarnings(uid);

    } catch (error) {
        console.error("Error loading dashboard data:", error);
        // يمكن إضافة رسالة خطأ للواجهة هنا
    }
}


// 
// ========================================================
// 10. إعداد مستمعي الأحداث على مستوى الصفحة
// ========================================================
// 
document.addEventListener('DOMContentLoaded', () => {
    
    const logoutBtn = document.getElementById('logoutBtn');
    
    // تشغيل منطق تسجيل الخروج
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await auth.signOut();
                // onAuthStateChanged سيقوم بالتوجيه إلى auth.html
            } catch (error) {
                console.error("Logout Error:", error);
            }
        });
    }
    
    // إضافة مستمعي النسخ (Copy Buttons)
    document.querySelectorAll('.copy-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const targetId = e.currentTarget.getAttribute('data-target');
            copyToClipboard(targetId);
        });
    });

    // تشغيل تحميل بيانات لوحة التحكم
    if (document.querySelector('.dashboard-container')) {
        auth.onAuthStateChanged(user => {
            if (user) {
                // تحقق نهائي قبل التحميل: هل المستخدم في صفحة Onboarding؟
                if (window.location.pathname.includes('onboarding.html')) return; 
                
                loadDashboardData(user.uid);
            } else {
                // إذا لم يكن مسجلاً، سيتم التوجيه عبر onAuthStateChanged في القسم 5
            }
        });
    }

});