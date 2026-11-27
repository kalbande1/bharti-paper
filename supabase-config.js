/**
 * ====================================================================
 * महाराष्ट्र पोलीस भरती सराव परीक्षा पोर्टल
 * Supabase कॉन्फिगरेशन आणि डेटा इंजिन (supabase-config.js)
 * ====================================================================
 */

// १. डीफॉल्ट Supabase क्रेडेन्शियल्स (येथे तुमची खरी URL व Key टाका)
var DEFAULT_SUPABASE_URL = "https://oazfengezweygcolqlsl.supabase.co";
var DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_tQSsDd7lNJQG1giM61tYOA_DS_vBT3E";

// LocalStorage किंवा डीफॉल्टमधून URL व Key मिळवणे
var SUPABASE_URL = localStorage.getItem('pyq_supabase_url') || DEFAULT_SUPABASE_URL;
var SUPABASE_ANON_KEY = localStorage.getItem('pyq_supabase_anon_key') || DEFAULT_SUPABASE_ANON_KEY;

// २. Supabase क्लायंट इनिशियलाईझ करणे
var supabaseClient = null;
var isSupabaseActive = false;

try {
    if (window.supabase && typeof window.supabase.createClient === 'function' && 
        SUPABASE_URL && !SUPABASE_URL.includes("your-project-id") && 
        SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes("your-supabase-anon-key")) {
        
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: { persistSession: true, autoRefreshToken: true }
        });
        isSupabaseActive = true;
        console.log("✅ Supabase क्लायंट यशस्वीरित्या सुरू झाला.");
    }
} catch (err) {
    console.error("Supabase इनिशिएलायझेशन त्रुटी:", err);
}

// जागतिक स्तरावर उपलब्ध करणे
window.supabaseClient = supabaseClient;
window.isSupabaseActive = isSupabaseActive;
window.DEFAULT_SUPABASE_URL = DEFAULT_SUPABASE_URL;
window.DEFAULT_SUPABASE_ANON_KEY = DEFAULT_SUPABASE_ANON_KEY;

// ३. सुरक्षित पासवर्ड हॅशिंग (SHA-256)
async function hashPassword(plain) {
    try {
        const msgBuffer = new TextEncoder().encode(plain.trim());
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
        let h = 0;
        for (let i = 0; i < plain.length; i++) {
            h = ((h << 5) - h) + plain.charCodeAt(i);
            h |= 0;
        }
        return "hash_" + Math.abs(h);
    }
}
window.hashPassword = hashPassword;

// ४. ऑथेंटिकेशन सेवा
var Auth = {
    getUser: function() {
        try {
            var data = localStorage.getItem('pyq_user');
            return data ? JSON.parse(data) : null;
        } catch (e) { return null; }
    },
    setUser: function(u) {
        localStorage.setItem('pyq_user', JSON.stringify(u));
    },
    logout: function() {
        localStorage.removeItem('pyq_user');
        window.location.href = 'login.html';
    }
};
window.Auth = Auth;
