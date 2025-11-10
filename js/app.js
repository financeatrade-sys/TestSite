// js/app.js
// 
// ========================================================
// 1. الأدوات المساعدة والوظائف الأساسية (Utilities & Core Functions)
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
 * @param {boolean} isSuccess - هل الرسالة رسالة نجاح (لتغيير اللون).
 */
function displayError(message, elementId = 'authError', isSuccess = false) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.remove('hidden');
        errorElement.style.color = isSuccess ? '#4CAF50' : '#dc3545';
        
        // إخفاء الرسالة بعد 5 ثوانٍ
        setTimeout(() => {
            errorElement.classList.add('hidden'); 
            errorElement.textContent = '';
        }, 5000);
    }
}

/**
 * دالة بسيطة لنسخ نص من حقل إدخال (Input Field) إلى الحافظة.
 * @param {string} targetId - ID حقل الإدخال الذي نريد نسخ محتواه.
 */
function copyToClipboard(targetId) {
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
        targetElement.select(); 
        targetElement.setSelectionRange(0, 99999); 
        document.execCommand("copy"); 
        alert(`Copied to clipboard: ${targetElement.value}`);
    }
}

// 
// ========================================================
// 1. القسم 1 ينتهى هنا ...........
// ========================================================
// 

// 
// ========================================================
// 2. وظائف المصادقة والتوجيه (Authentication & Redirection)
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
            // يحدث هذا للمستخدمين الجدد الذين سجلوا عبر جوجل ولم يكملوا بياناتهم.
            console.log("User document does not exist, redirecting to Onboarding.");
            return window.location.href = 'onboarding.html';
        }

        const userData = userDoc.data();
        const role = userData.role || 'user'; // الدور الافتراضي هو 'user'

        // التوجيه بناءً على الدور
        switch (role) {
            case 'admin':
                window.location.href = 'admin-dash.html'; // يفترض وجود صفحة إدارية
                break;
            case 'user':
            default:
                window.location.href = 'dashboard.html';
                break;
        }

    } catch (error) {
        console.error("Error redirecting user:", error);
        // في حالة الفشل، توجه إلى لوحة التحكم الافتراضية
        window.location.href = 'dashboard.html';
    }
}


// 
// ========================================================
// 3. التحقق من حالة المصادقة (Auth State Listener)
// هذه الوظيفة تعمل على كل صفحة
// ========================================================
// 

// يعمل المستمع هذا على كل تحميل صفحة لفرض الحماية
auth.onAuthStateChanged(user => {
    const currentPage = window.location.pathname;
    
    // الصفحات التي تتطلب تسجيل دخول
    const protectedPages = [
        'dashboard.html', 
        'pool.html',
        'onboarding.html',
        'admin-dash.html' // إضافة صفحة الإدارة هنا
    ]; 
    
    // الصفحات العامة (التي لا تتطلب تسجيل دخول)
    const publicPages = ['auth.html', 'index.html', '/']; 

    if (user) {
        // المستخدم مسجل دخوله
        if (publicPages.some(page => currentPage.includes(page))) {
             // إذا كان في صفحة عامة (مثل auth.html)، يتم توجيهه مباشرة
             if (currentPage.includes('auth.html')) {
                 redirectToDashboard(user.uid);
             }
        }
        // في الصفحات الداخلية (dashboard, pool, market)، لا نفعل شيئاً ونتركه يواصل.

    } else {
        // المستخدم غير مسجل دخوله
        if (protectedPages.some(page => currentPage.includes(page))) {
            // إذا حاول الوصول لصفحة محمية، يتم إرساله إلى صفحة الدخول
            window.location.href = 'auth.html';
        }
    }
});
// 
// ========================================================
// 2. القسم 2 ينتهى هنا
// ========================================================
//

// 
// ========================================================
// 3. وظائف المصادقة الخاصة بـ auth.html
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

            // 1. التحقق من تفرد اسم المستخدم
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
                    role: 'user', 
                    balance: 0,
                    points: 0,
                    reservedForOffers: 0,
                    pointsPendingPool: 0,
                    primeLevel: 0,
                    stakedAmount: 0,
                    referralCode: generateReferralCode(), 
                    referredBy: referralCode || null, 
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


// ... (القسم 3 ينتهى هنا) ...

// 
// ========================================================
// 4. وظيفة إكمال التسجيل (ONBOARDING LOGIC)
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
                        role: 'user', 
                        balance: 0,
                        points: 0,
                        reservedForOffers: 0,
                        pointsPendingPool: 0,
                        primeLevel: 0,
                        stakedAmount: 0,
                        referralCode: generateReferralCode(), 
                        referredBy: referralCode || null, 
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


// ... (القسم 4 ينتهى هنا) ...

// 
// ========================================================
// 5. وظيفة تحميل بيانات أرباح الإحالة (Referral Logic)
// ========================================================
// 

/**
 * دالة لتهيئة وعرض بيانات الأرباح من الإحالة في الجدول.
 * @param {string} referrerId - UID المستخدم المُحيل الحالي.
 */
async function loadReferralEarnings(referrerId) {
    const tableBody = document.querySelector('#referralsTable tbody');
    const noReferralsMsg = document.getElementById('noReferralsMsg');
    
    // 1. جلب سجلات أرباح الإحالة باستخدام الفهرس المركب (referrerId, timestamp)
    const earningsSnapshot = await db.collection('referral_earnings')
                                    .where('referrerId', '==', referrerId)
                                    .orderBy('timestamp', 'desc')
                                    .get();
    
    if (!tableBody) return; // حماية في حال عدم وجود الجدول في الصفحة الحالية
    
    tableBody.innerHTML = ''; // مسح المحتوى القديم
    
    if (earningsSnapshot.empty) {
        if (noReferralsMsg) noReferralsMsg.classList.remove('hidden');
        return;
    }

    if (noReferralsMsg) noReferralsMsg.classList.add('hidden');
    
    // 2. تجميع الأرباح حسب اسم المستخدم المُحال 
    const aggregatedEarnings = {};
    earningsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const username = data.referredUsername;
        
        if (!aggregatedEarnings[username]) {
            aggregatedEarnings[username] = { 
                totalPoints: 0, 
                // نستخدم تاريخ أول ربح كتقريب لتاريخ الانضمام/أول ربح
                joinDate: data.timestamp 
            };
        }
        aggregatedEarnings[username].totalPoints += data.amountEarned;
    });

    // 3. ملء الجدول
    for (const username in aggregatedEarnings) {
        const data = aggregatedEarnings[username];
        // تحويل timestamp إلى تاريخ عرض محلي
        const date = data.joinDate ? data.joinDate.toDate().toLocaleDateString() : 'N/A';
        
        const row = tableBody.insertRow();
        row.insertCell(0).textContent = username;
        row.insertCell(1).textContent = data.totalPoints.toLocaleString();
        row.insertCell(2).textContent = date;
    }
}


// ... (القسم 5 ينتهى هنا) ...

// 
// ========================================================
// 6. وظائف مجمع التحويل (Pool Logic)
// ========================================================
// 

/**
 * حساب وعرض الوقت المتبقي حتى منتصف الليل التالي (وقت التحويل الافتراضي).
 */
function startConversionCountdown() {
    const countdownElement = document.getElementById('countdownTimer');
    if (!countdownElement) return;

    function updateTimer() {
        const now = new Date();
        const midnight = new Date(now);
        
        // تعيين التاريخ لمنتصف ليل اليوم التالي (00:00:00)
        midnight.setDate(now.getDate() + 1);
        midnight.setHours(0, 0, 0, 0);

        const timeRemaining = midnight.getTime() - now.getTime();

        if (timeRemaining < 0) {
            countdownElement.textContent = "Processing...";
            return;
        }

        const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
        const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);

        // تنسيق الوقت
        const format = (unit) => String(unit).padStart(2, '0');

        countdownElement.textContent = `${format(hours)}:${format(minutes)}:${format(seconds)}`;
    }

    // تحديث كل ثانية
    updateTimer();
    setInterval(updateTimer, 1000);
}


/**
 * إرسال طلب تحويل النقاط إلى مجمع السيولة باستخدام Firestore Transaction.
 * @param {string} uid - UID المستخدم.
 * @param {number} pointsAmount - عدد النقاط المراد تحويلها.
 */
async function submitToConversionPool(uid, pointsAmount) {
    const userRef = db.collection('users').doc(uid);
    const poolStatusRef = db.collection('system').doc('pool_status');
    
    if (pointsAmount < 1000) {
        alert("Minimum conversion amount is 1,000 points.");
        return;
    }

    try {
        const result = await db.runTransaction(async (transaction) => {
            // 1. قراءة البيانات
            const userDoc = await transaction.get(userRef);
            const poolDoc = await transaction.get(poolStatusRef);

            if (!userDoc.exists || !poolDoc.exists) {
                throw new Error("Critical data missing: User or Pool Status.");
            }

            const userData = userDoc.data();
            const poolData = poolDoc.data();
            const rate = poolData.conversionRate || 1000;
            const estimatedUSD = pointsAmount / rate;
            
            // 2. التحقق من رصيد المستخدم
            if (userData.points < pointsAmount) {
                throw new Error("Insufficient points balance.");
            }

            // 3. كتابة التحديثات (في المعاملة)
            
            // أ. تحديث وثيقة المستخدم
            transaction.update(userRef, {
                points: userData.points - pointsAmount,
                pointsPendingPool: (userData.pointsPendingPool || 0) + pointsAmount,
                lastPoolSubmissionDate: firebase.firestore.FieldValue.serverTimestamp()
            });

            // ب. تحديث وثيقة حالة المجمع (زيادة إجمالي النقاط المعلقة)
            transaction.update(poolStatusRef, {
                totalPointsPending: poolData.totalPointsPending + pointsAmount
            });

            // ج. إنشاء طلب جديد في conversion_pool
            // ملاحظة: لا يمكن استخدام db.collection().add() داخل المعاملة مباشرة، لذا سنقوم بإنشاء الوثيقة خارجها ولكن نعتبرها جزءاً من نجاح المعاملة
            await db.collection('conversion_pool').add({
                userId: uid,
                pointsAmount: pointsAmount,
                usdEquivalent: estimatedUSD,
                status: 'pending',
                submittedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            return `Successfully submitted ${pointsAmount.toLocaleString()} points for conversion. Estimated value: $${estimatedUSD.toFixed(2)}`;
        });
        
        alert(result);
        // إعادة تحميل الواجهة لعكس التغييرات
        if (window.location.pathname.includes('pool.html')) {
             loadPoolPageData(uid);
        } else {
             loadDashboardData(uid);
        }

    } catch (e) {
        const errorMsg = e.message || e;
        console.error("Conversion Transaction Failed:", errorMsg);
        alert(`Conversion Failed: ${errorMsg}`);
    }
}


/**
 * جلب وعرض سجل إرسالات النقاط للمستخدم في صفحة Pool.
 * @param {string} userId - UID المستخدم الحالي.
 */
async function loadPoolHistory(userId) {
    const tableBody = document.getElementById('poolHistoryTableBody');
    const noHistoryMsg = document.getElementById('noPoolHistoryMsg');
    
    // 1. جلب سجلات الإرسال الخاصة بالمستخدم فقط
    const historySnapshot = await db.collection('conversion_pool')
                                    .where('userId', '==', userId)
                                    .orderBy('submittedAt', 'desc')
                                    .get();
    
    if (!tableBody) return; // حماية
    tableBody.innerHTML = ''; 
    
    if (historySnapshot.empty) {
        if (noHistoryMsg) noHistoryMsg.classList.remove('hidden');
        return;
    }

    if (noHistoryMsg) noHistoryMsg.classList.add('hidden');
    
    // 2. ملء الجدول
    historySnapshot.docs.forEach(doc => {
        const data = doc.data();
        const date = data.submittedAt ? data.submittedAt.toDate().toLocaleDateString() : 'N/A';
        
        const row = tableBody.insertRow();
        row.insertCell(0).textContent = date;
        row.insertCell(1).textContent = data.pointsAmount.toLocaleString();
        row.insertCell(2).textContent = `$${(data.usdEquivalent || 0).toFixed(2)}`;
        
        const statusCell = row.insertCell(3);
        statusCell.textContent = data.status.toUpperCase();
        statusCell.style.color = data.status === 'pending' ? '#ff9900' : '#4caf50'; 

        row.insertCell(4).textContent = data.status === 'processed' 
            ? `$${(data.usdReceived || 0).toFixed(2)}` 
            : '--';
    });
}


// ... (القسم 6 ينتهى هنا) ...

// 
// ========================================================
// 7. وظائف تحميل بيانات الصفحات الرئيسية (Data Loaders)
// ========================================================
// 

/**
 * دالة تحميل وعرض جميع البيانات في صفحة Dashboard.
 * @param {string} uid - UID المستخدم.
 */
async function loadDashboardData(uid) {
    try {
        // 1. جلب وثيقة المستخدم
        const userDoc = await db.collection('users').doc(uid).get();
        if (!userDoc.exists) {
            console.error("User profile data not found.");
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
        document.getElementById('totalRefEarnings').textContent = (data.totalReferralEarnings || 0).toLocaleString(); 
        
        // تحميل بيانات الجدول التفصيلي للإحالة
        await loadReferralEarnings(uid);

    } catch (error) {
        console.error("Error loading dashboard data:", error);
    }
}


/**
 * دالة تحميل وعرض جميع البيانات في صفحة Pool.
 * @param {string} uid - UID المستخدم.
 */
async function loadPoolPageData(uid) {
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        const userPoolRef = db.collection('system').doc('pool_status');
        const poolDoc = await userPoolRef.get();

        if (!userDoc.exists || !poolDoc.exists) {
            console.error("Critical data not found.");
            return;
        }

        const userData = userDoc.data();
        const poolData = poolDoc.data();
        const rate = poolData.conversionRate || 1000;
        
        // 1. تحديث قسم Global Status
        document.getElementById('poolUSDValue').textContent = `$${(poolData.currentPoolUSD || 0).toFixed(2)}`;
        document.getElementById('totalPoolPoints').textContent = (poolData.totalPointsPending || 0).toLocaleString();
        startConversionCountdown(); 
        
        // 2. تحديث منطقة التحويل الشخصية
        document.getElementById('currentPoints').textContent = (userData.points || 0).toLocaleString();
        document.getElementById('pendingPoints').textContent = (userData.pointsPendingPool || 0).toLocaleString();
        document.getElementById('poolRate').textContent = rate.toLocaleString();

        // 3. مستمع لتحديث القيمة المقدرة
        const pointsInput = document.getElementById('pointsToConvert');
        if (pointsInput) {
             pointsInput.addEventListener('input', () => {
                const points = parseFloat(pointsInput.value) || 0;
                const estimatedUSD = (points / rate).toFixed(2);
                document.getElementById('estUSDValue').textContent = `$${estimatedUSD}`;
            });
        }
       
        // 4. ربط زر الإرسال (Submit)
        const submitBtn = document.getElementById('submitToPoolBtn');
        if (submitBtn) {
            submitBtn.onclick = () => { 
                const points = parseFloat(document.getElementById('pointsToConvert').value);
                if (points && points > 0) {
                    submitToConversionPool(uid, points); 
                } else {
                    alert("Please enter a valid amount of points.");
                }
            };
        }

        // 5. تحميل سجل الإرسالات
        await loadPoolHistory(uid);

    } catch (error) {
        console.error("Error loading Pool Page data:", error);
    }
}


// ... (القسم 7 ينتهى هنا) ...

// 
// ========================================================
// 8. إعداد مستمعي الأحداث على مستوى الصفحة (التوجيه النهائي)
// ========================================================
// 
document.addEventListener('DOMContentLoaded', () => {
    
    const logoutBtn = document.getElementById('logoutBtn');
    
    // 1. تشغيل منطق تسجيل الخروج
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await auth.signOut();
                // onAuthStateChanged في القسم 2 سيقوم بالتوجيه إلى auth.html
            } catch (error) {
                console.error("Logout Error:", error);
            }
        });
    }
    
    // 2. إضافة مستمعي النسخ (Copy Buttons)
    document.querySelectorAll('.copy-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const targetId = e.currentTarget.getAttribute('data-target');
            copyToClipboard(targetId); // دالة copyToClipboard موجودة في القسم 1
        });
    });

    // 3. تشغيل تحميل بيانات الصفحة الصحيحة (Dashboard أو Pool)
    if (document.querySelector('.dashboard-container')) {
        auth.onAuthStateChanged(user => {
            if (user) {
                const currentPath = window.location.pathname;
                
                // منع تشغيل وظائف التحميل إذا كنا في صفحة Onboarding
                if (currentPath.includes('onboarding.html')) return; 

                // منطق التحقق والتوجيه الصحيح
                if (currentPath.includes('pool.html')) {
                    console.log("Loading Pool Page Data...");
                    loadPoolPageData(user.uid);
                } else if (currentPath.includes('dashboard.html')) {
                    console.log("Loading Dashboard Data...");
                    loadDashboardData(user.uid);
                }
                
                // يمكن إضافة else if (currentPath.includes('market.html')) هنا لاحقاً

            } else {
                // إذا لم يكن مسجلاً، سيتم التوجيه عبر onAuthStateChanged في القسم 2
            }
        });
    }
});


// ... (القسم 8 ينتهى هنا) ...

// 
// ========================================================
// 9. منطق لوحة تحكم الإدارة (ADMIN DASHBOARD LOGIC)
// ========================================================
// 

// متغير عام لحفظ محرر Quill (تم تعريفه مرة واحدة في بداية القسم 10/تم نقله هنا لتبسيط التنظيم)
let quillEditor; 
// متغير عام لحفظ ID المقال الذي يتم تعديله حالياً (null للنشر الجديد) (تم تعريفه مرة واحدة في بداية القسم 10/تم نقله هنا لتبسيط التنظيم)
let currentEditingPostId = null;

/**
 * دالة للتحقق من أن المستخدم لديه دور "admin"
 * وتوجيهه إذا لم يكن كذلك.
 * @param {Object} user - كائن مستخدم Firebase.
 * @param {Object} userData - بيانات المستخدم من Firestore.
 */
function checkAdminRole(user, userData) {
    if (userData.role !== 'admin') {
        alert("Access Denied: You are not authorized to view the Admin Dashboard.");
        auth.signOut();
        window.location.href = 'auth.html';
        return false;
    }
    return true;
}


/**
 * دالة تحميل وعرض جميع بيانات النظام في لوحة تحكم الإدارة.
 * @param {string} uid - UID المستخدم المسؤول.
 */
async function loadAdminDashboardData(uid) {
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        const poolDoc = await db.collection('system').doc('pool_status').get();
        const summaryDoc = await db.collection('system').doc('system_summary').get(); // افتراض وجود وثيقة ملخص

        if (!userDoc.exists) return;

        const userData = userDoc.data();
        if (!checkAdminRole(userDoc, userData)) return;
        
        // 4. تهيئة محرر Quill (يجب أن يتم هنا لضمان وجود العنصر في DOM)
        initializeQuillEditor();

        // 1. تحديث التحية
        document.getElementById('adminGreeting').textContent = `Welcome, ${userData.username || 'Admin'}! 👋`;
        document.getElementById('authorName').value = userData.username || 'Admin'; // ملء اسم المؤلف

        // 2. تحديث ملخص النظام (System Summary)
        if (summaryDoc.exists) {
            const summaryData = summaryDoc.data();
            document.getElementById('platformBalance').textContent = `$${(summaryData.platformBalance || 0).toFixed(2)}`;
            document.getElementById('totalPointsIssued').textContent = (summaryData.totalPointsIssued || 0).toLocaleString();
            document.getElementById('totalStakedValue').textContent = `$${(summaryData.totalStakedValue || 0).toFixed(2)}`;
        }

        // 3. تحديث إدارة المجمع (Pool Management)
        if (poolDoc.exists) {
            const poolData = poolDoc.data();
            document.getElementById('currentPoolUSDValue').textContent = `$${(poolData.currentPoolUSD || 0).toFixed(2)}`;
            
            if (poolData.nextSettlementTime) {
                const date = poolData.nextSettlementTime.toDate().toLocaleString();
                document.getElementById('scheduledSettlementDate').textContent = date;
                // قم بملء حقل datetime-local للقيمة الحالية
                const localISOTime = poolData.nextSettlementTime.toDate().toISOString().substring(0, 16);
                document.getElementById('nextSettlementDateTime').value = localISOTime;
            } else {
                document.getElementById('scheduledSettlementDate').textContent = 'Not Scheduled';
            }
        }
        
        // 5. تحميل وعرض المقالات الحالية (Content Management)
        await loadContentList();

    } catch (error) {
        console.error("Error loading Admin Dashboard data:", error);
    }
}


// ... (القسم 9 ينتهى هنا) ...

// 
// ========================================================
// 10. منطق نظام إدارة المحتوى (CMS Logic) - تحديث التعديل والحذف
// ========================================================
// 

/**
 * دالة لتهيئة محرر Quill (Rich Text Editor).
 */
function initializeQuillEditor() {
    if (typeof Quill === 'undefined' || quillEditor) return; 

    // تهيئة Quill كما تم الاتفاق عليه سابقاً
    quillEditor = new Quill('#editor', {
        theme: 'snow',
        placeholder: 'Write your article content here...',
        modules: {
            toolbar: [
                ['bold', 'italic', 'underline', 'strike'], 
                ['blockquote', 'code-block'],
                [{ 'header': 1 }, { 'header': 2 }], 
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                [{ 'script': 'sub'}, { 'script': 'super' }], 
                [{ 'indent': '-1'}, { 'indent': '+1' }], 
                [{ 'direction': 'rtl' }], 
                [{ 'size': ['small', false, 'large', 'huge'] }],
                [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                [{ 'color': [] }, { 'background': [] }], 
                [{ 'font': [] }],
                [{ 'align': [] }],
                ['link', 'image', 'video'], 
                ['clean'] 
            ]
        }
    });
}

/**
 * معالجة إرسال نموذج نشر/تعديل المقال.
 * @param {string} authorId - UID للمستخدم المسؤول.
 */
async function handleNewPostSubmission(authorId) {
    const title = document.getElementById('postTitle').value;
    const category = document.getElementById('postCategory').value;
    const slug = document.getElementById('postSlug').value;
    const coverImageUrl = document.getElementById('coverImageUrl').value;
    const authorName = document.getElementById('authorName').value;
    const isPublished = document.getElementById('postStatusPublished').checked;
    
    // الحصول على المحتوى بتنسيق HTML من Quill
    const contentBody = quillEditor.root.innerHTML;

    if (!title || !category || !slug || contentBody === '<p><br></p>') {
        return displayError("Please fill all required fields (Title, Category, Slug, Content).", 'postMessage');
    }

    // 1. التحقق من تفرد الـ Slug (فقط إذا كان المقال جديداً أو تم تغيير الـ Slug)
    if (!currentEditingPostId || slug !== document.getElementById('postSlug').getAttribute('data-original-slug')) {
        const slugExists = await db.collection('content').where('slug', '==', slug).limit(1).get();
        if (!slugExists.empty) {
            return displayError("Error: This SEO Slug is already in use. Please choose another one.", 'postMessage');
        }
    }

    try {
        const postData = {
            title: title,
            category: category,
            slug: slug,
            coverImageUrl: coverImageUrl || '',
            authorId: authorId,
            authorName: authorName,
            contentBody: contentBody,
            status: isPublished ? 'published' : 'draft',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (currentEditingPostId) {
            // حالة التعديل (Update)
            await db.collection('content').doc(currentEditingPostId).update(postData);
            displayError("Article updated successfully!", 'postMessage', true);
        } else {
            // حالة النشر الجديد (New Post)
            postData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('content').add(postData);
            displayError("Article published/drafted successfully!", 'postMessage', true);
        }

        // إعادة تهيئة النموذج
        resetPostForm();
        loadContentList(); // تحديث جدول العرض

    } catch (error) {
        console.error("Post Submission Error:", error);
        displayError(`Post submission failed: ${error.message}`, 'postMessage');
    }
}

/**
 * إعادة تعيين نموذج النشر إلى حالته الافتراضية.
 */
function resetPostForm() {
    document.getElementById('newPostForm').reset();
    quillEditor.setText('');
    document.getElementById('postMessage').classList.add('hidden');
    document.getElementById('postSlug').removeAttribute('data-original-slug');
    currentEditingPostId = null; 
    document.querySelector('.tab-btn[data-tab="publishTab"]').textContent = 'Publish New Article';
}


/**
 * تحميل بيانات المقال في نموذج التحرير عند الضغط على زر Edit.
 * @param {string} postId - ID وثيقة المقال.
 */
async function handleEditPost(postId) {
    try {
        const doc = await db.collection('content').doc(postId).get();
        if (!doc.exists) {
            alert("Error: Article not found.");
            return;
        }

        const data = doc.data();

        // 1. ملء الحقول بالبيانات الحالية
        document.getElementById('postTitle').value = data.title;
        document.getElementById('postCategory').value = data.category;
        document.getElementById('postSlug').value = data.slug;
        document.getElementById('coverImageUrl').value = data.coverImageUrl || '';
        document.getElementById('postStatusPublished').checked = data.status === 'published';
        
        // حفظ الـ Slug الأصلي للتحقق من التكرار
        document.getElementById('postSlug').setAttribute('data-original-slug', data.slug);

        // 2. تحميل محتوى HTML في محرر Quill
        // يرجى ملاحظة: يجب استخدام .clipboard.dangerouslyPasteHTML لتجنب المشاكل
        quillEditor.clipboard.dangerouslyPasteHTML(data.contentBody);
        
        // 3. تحديث الحالة
        currentEditingPostId = postId;
        document.querySelector('.tab-btn[data-tab="publishTab"]').textContent = 'Edit Article';
        
        // 4. التبديل إلى تبويبة النشر/التعديل
        document.querySelector('.tab-btn[data-tab="publishTab"]').click();

    } catch (error) {
        console.error("Error loading post for edit:", error);
        alert("Failed to load article for editing.");
    }
}

/**
 * حذف مقال بعد تأكيد المسؤول.
 * @param {string} postId - ID وثيقة المقال.
 */
async function handleDeletePost(postId) {
    if (!confirm("Are you sure you want to permanently delete this article?")) {
        return;
    }

    try {
        await db.collection('content').doc(postId).delete();
        alert("Article deleted successfully.");
        loadContentList(); // تحديث الجدول بعد الحذف
    } catch (error) {
        console.error("Error deleting post:", error);
        alert("Failed to delete the article.");
    }
}


/**
 * تحميل وعرض قائمة المقالات في جدول "View & Edit Articles".
 */
async function loadContentList() {
    const tableBody = document.getElementById('contentListBody');
    if (!tableBody) return;

    try {
        const contentSnapshot = await db.collection('content')
                                        .orderBy('createdAt', 'desc')
                                        .get();
        
        tableBody.innerHTML = '';

        contentSnapshot.docs.forEach(doc => {
            const data = doc.data();
            const row = tableBody.insertRow();
            const date = data.createdAt ? data.createdAt.toDate().toLocaleDateString() : 'N/A';
            
            row.insertCell(0).textContent = data.title;
            row.insertCell(1).textContent = data.category.toUpperCase();
            row.insertCell(2).textContent = data.authorName;
            row.insertCell(3).textContent = date;
            
            const statusCell = row.insertCell(4);
            statusCell.textContent = data.status.toUpperCase();
            statusCell.style.color = data.status === 'published' ? '#4caf50' : '#ff9900'; 

            const actionsCell = row.insertCell(5);
            actionsCell.innerHTML = `
                <button class="small-btn edit-btn action-btn" data-id="${doc.id}">Edit</button>
                <button class="small-btn danger-btn delete-btn action-btn" data-id="${doc.id}">Delete</button>
            `;
        });

        // 3. إضافة مستمعي الأحداث لأزرار الإجراءات (Edit/Delete)
        document.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                handleEditPost(e.target.getAttribute('data-id'));
            });
        });

        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                handleDeletePost(e.target.getAttribute('data-id'));
            });
        });
        
    } catch (error) {
        console.error("Error loading content list:", error);
    }
}



// ... (القسم 10 ينتهى هنا) ...

// 
// ========================================================
// 11. إعداد مستمعي الأحداث على مستوى الصفحة (التوجيه النهائي)
// ========================================================
// 
document.addEventListener('DOMContentLoaded', () => {
    
    const currentPath = window.location.pathname;
    
    const logoutBtn = document.getElementById('logoutBtn');
    
    // 1. تشغيل منطق تسجيل الخروج (موجود في جميع الصفحات المحمية)
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await auth.signOut();
                // onAuthStateChanged في القسم 2 سيقوم بالتوجيه إلى auth.html
            } catch (error) {
                console.error("Logout Error:", error);
            }
        });
    }
    
    // 2. إضافة مستمعي النسخ (Copy Buttons)
    document.querySelectorAll('.copy-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const targetId = e.currentTarget.getAttribute('data-target');
            copyToClipboard(targetId); 
        });
    });

    // 3. منطق الصفحات المحمية (Dashboard, Pool, Admin)
    if (document.querySelector('.dashboard-container') || currentPath.includes('pool.html') || currentPath.includes('admin-dash.html')) {

        const isAdminPage = currentPath.includes('admin-dash.html');

        // 3.1. مستمع حالة المصادقة الرئيسي
        auth.onAuthStateChanged(user => {
            if (user) {
                
                // منع تشغيل وظائف التحميل إذا كنا في صفحة Onboarding (انتقال مؤقت)
                if (currentPath.includes('onboarding.html')) return; 

                // 3.2. توجيه تحميل البيانات الصحيح
                if (isAdminPage) {
                    console.log("Loading Admin Dashboard Data...");
                    loadAdminDashboardData(user.uid);
                } else if (currentPath.includes('pool.html')) {
                    console.log("Loading Pool Page Data...");
                    loadPoolPageData(user.uid);
                } else if (currentPath.includes('dashboard.html')) {
                    console.log("Loading Dashboard Data...");
                    loadDashboardData(user.uid);
                }
                
                // 3.3. تفعيل مستمعي أحداث الإدارة إذا كنا في صفحة Admin
                if (isAdminPage) {
                    
                    // منطق الإدارة: تحديث وإعداد الوقت والسيولة (تتطلب Cloud Functions لاحقاً)
                    document.getElementById('updatePoolBtn').addEventListener('click', () => {
                        const amount = parseFloat(document.getElementById('addPoolAmount').value);
                        if (amount > 0) {
                            alert(`Feature not yet implemented: Transaction to add $${amount.toFixed(2)} to Pool (Requires Cloud Function).`);
                        } else {
                            alert("Please enter a valid amount.");
                        }
                    });
                    
                    document.getElementById('setSettlementTimeBtn').addEventListener('click', async () => {
                        const dateTimeLocal = document.getElementById('nextSettlementDateTime').value;
                        if (dateTimeLocal) {
                            const scheduledTime = new Date(dateTimeLocal);
                            await db.collection('system').doc('pool_status').update({
                                nextSettlementTime: scheduledTime 
                            });
                            alert(`Next settlement time set to: ${scheduledTime.toLocaleString()}`);
                            loadAdminDashboardData(user.uid); 
                        } else {
                            alert("Please select a date and time.");
                        }
                    });
                    
                    document.getElementById('runSettlementBtn').addEventListener('click', () => {
                        if (confirm("WARNING: Are you sure you want to FORCE RUN the settlement NOW?")) {
                            alert("Feature not yet implemented: Running settlement process (Requires Cloud Function).");
                        }
                    });
                    
                    document.getElementById('searchUserBtn').addEventListener('click', () => {
                        const query = document.getElementById('userSearchInput').value;
                        if (query) {
                            alert(`Feature not yet implemented: Searching for user: ${query} (Requires Cloud Function).`);
                        }
                    });

                    // ربط نموذج CMS
                    const newPostForm = document.getElementById('newPostForm');
                    if (newPostForm) {
                        newPostForm.addEventListener('submit', (e) => {
                            e.preventDefault();
                            handleNewPostSubmission(user.uid);
                        });
                    }

                    // 3.4. منطق التبويبات (Tabs Logic)
                    document.querySelectorAll('.tab-btn').forEach(button => {
                        button.addEventListener('click', () => {
                            const targetId = button.getAttribute('data-tab');
                            
                            // إلغاء تفعيل جميع الأزرار والمحتوى
                            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
                            document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));

                            // تفعيل الزر والمحتوى المستهدف
                            button.classList.add('active');
                            document.getElementById(targetId).classList.remove('hidden');

                            // إذا انتقلنا إلى تبويبة النشر/التعديل، يجب مسح النموذج إذا كنا في وضع التعديل
                            if (targetId === 'publishTab') {
                                // هذا المستمع تم إضافته لضمان التبديل من وضع التعديل إلى النشر الجديد
                                if (currentEditingPostId) {
                                    resetPostForm();
                                }
                            }
                        });
                    });
                }


            } else {
                // ليس مسجلاً، يتم توجيهه إلى auth.html
            }
        });
    }
});