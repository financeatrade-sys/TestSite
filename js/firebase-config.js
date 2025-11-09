// js/firebase-config.js

// 
// ========================================================
// FIREBASE CONFIGURATION START
// هذا الجزء يقوم بتهيئة Firebase SDKs باستخدام مفاتيح API الخاصة بالمشروع.
// يرجى استبدال القيم التالية بالقيم الحقيقية لمشروعك.
// ========================================================
// 

const firebaseConfig = {
    apiKey: "AIzaSyC2YlHHU3tsxUu-e0OWYZ8giwxWRFq0Gz0", 
    authDomain: "tokenyouown.firebaseapp.com",
    projectId: "tokenyouown",
    storageBucket: "tokenyouown.firebasestorage.app",
    messagingSenderId: "89513352509",
    appId: "1:89513352509:web:733f71c1760345107ef954",
	measurementId: "G-49W436ZP38"
};

// تهيئة Firebase
firebase.initializeApp(firebaseConfig);

// تعريف المتغيرات العالمية للخدمات الرئيسية
const auth = firebase.auth();
const db = firebase.firestore();

// 
// ========================================================
// FIREBASE CONFIGURATION END
// تم تهيئة الخدمات الرئيسية: auth للمصادقة، و db لقاعدة البيانات Firestore.
// ========================================================
//