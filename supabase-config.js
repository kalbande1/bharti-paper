/**
 * ====================================================================
 * महाराष्ट्र पोलीस भरती सराव परीक्षा पोर्टल
 * Supabase कॉन्फिगरेशन आणि डेटा इंजिन (supabase-config.js)
 * ====================================================================
 */

// १. Supabase क्रेडेन्शियल्स (येथे तुमची Supabase Project URL आणि Anon Key टाका)
const DEFAULT_SUPABASE_URL = "https://your-project-id.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "your-supabase-anon-key";

const SUPABASE_URL = localStorage.getItem('pyq_supabase_url') || DEFAULT_SUPABASE_URL;
const SUPABASE_ANON_KEY = localStorage.getItem('pyq_supabase_anon_key') || DEFAULT_SUPABASE_ANON_KEY;

let supabase = null;
let isSupabaseActive = false;

try {
    if (window.supabase && SUPABASE_URL && !SUPABASE_URL.includes("your-project-id") && SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes("your-supabase-anon-key")) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: { persistSession: true, autoRefreshToken: true }
        });
        isSupabaseActive = true;
        console.log("✅ Supabase क्लायंट सक्रिय झाला आहे.");
    } else {
        console.warn("⚠️ Supabase क्रेडेन्शियल्स सेट केलेले नाहीत किंवा स्थानिक (Local Demo) मोड चालू आहे.");
    }
} catch (err) {
    console.error("Supabase इनिशिएलायझेशन त्रुटी:", err);
    isSupabaseActive = false;
}

// २. सुरक्षित UUID जनरेटर
function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// ३. सुरक्षित पासवर्ड हॅशिंग (SHA-256 Web Crypto API)
async function hashPassword(plainTextPassword) {
    try {
        const msgBuffer = new TextEncoder().encode(plainTextPassword.trim());
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
        let hash = 0;
        for (let i = 0; i < plainTextPassword.length; i++) {
            const char = plainTextPassword.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0;
        }
        return "local_hash_" + Math.abs(hash);
    }
}

// ४. स्थानिक स्टोरेज कीज
const LOCAL_STORAGE_KEYS = {
    STUDENTS: 'pyq_local_students',
    CURRENT_USER: 'pyq_user'
};

// ५. ऑथेंटिकेशन सेवा
const Auth = {
    getUser: function() {
        try {
            const data = localStorage.getItem(LOCAL_STORAGE_KEYS.CURRENT_USER);
            return data ? JSON.parse(data) : null;
        } catch (e) { return null; }
    },
    setUser: function(user) {
        localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    },
    logout: function() {
        localStorage.removeItem(LOCAL_STORAGE_KEYS.CURRENT_USER);
        window.location.href = 'login.html';
    }
};

// ६. डेटाबेस ऑपरेशन्स
const DB = {
    // --- विद्यार्थी नोंदणी (Student Registration) ---
    registerStudent: async function(studentData) {
        const { fullName, mobile, email, bhartiType, password } = studentData;
        const cleanName = fullName.trim();
        const cleanMobile = mobile.trim();
        const cleanEmail = email.trim().toLowerCase();
        const passwordHash = await hashPassword(password);

        try {
            // १. Supabase सक्रिय असल्यास थेट सेव्ह करणे
            if (isSupabaseActive && supabase) {
                const { data: existing, error: checkError } = await supabase
                    .from('students')
                    .select('id, mobile, email')
                    .or(`mobile.eq.${cleanMobile},email.ilike.${cleanEmail}`);

                if (checkError) {
                    console.warn("तपासणी त्रुटी:", checkError);
                } else if (existing && existing.length > 0) {
                    const matchMobile = existing.some(s => s.mobile === cleanMobile);
                    if (matchMobile) {
                        return { success: false, message: 'हा मोबाईल नंबर आधीच नोंदणीकृत आहे. कृपया लॉगिन करा.' };
                    }
                    return { success: false, message: 'हा ईमेल आयडी आधीच नोंदणीकृत आहे.' };
                }

                const insertPayload = {
                    full_name: cleanName,
                    mobile: cleanMobile,
                    email: cleanEmail,
                    bharti_type: bhartiType,
                    password_hash: passwordHash,
                    role: 'student',
                    is_approved: false,
                    status: 'pending'
                };

                const { data, error } = await supabase.from('students').insert([insertPayload]).select();
                if (error) {
                    console.error("Supabase नोंदणी त्रुटी:", error);
                    if (error.code === '23505') {
                        return { success: false, message: 'हा मोबाईल नंबर किंवा ईमेल आधीच नोंदणीकृत आहे.' };
                    }
                    return { success: false, message: 'नोंदणी त्रुटी: ' + (error.message || 'डेटाबेस त्रुटी') };
                }

                return { success: true, student: (data && data[0]) ? data[0] : insertPayload };
            }

            // २. स्थानिक डेमो मोड (LocalStorage Fallback)
            const students = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.STUDENTS) || '[]');
            if (students.some(s => s.mobile === cleanMobile)) {
                return { success: false, message: 'हा मोबाईल नंबर आधीच नोंदणीकृत आहे. कृपया लॉगिन करा.' };
            }
            if (students.some(s => s.email.toLowerCase() === cleanEmail)) {
                return { success: false, message: 'हा ईमेल आयडी आधीच नोंदणीकृत आहे.' };
            }

            const newStudent = {
                id: generateUUID(),
                full_name: cleanName,
                mobile: cleanMobile,
                email: cleanEmail,
                bharti_type: bhartiType,
                password_hash: passwordHash,
                role: 'student',
                is_approved: false,
                status: 'pending',
                created_at: new Date().toISOString()
            };

            students.push(newStudent);
            localStorage.setItem(LOCAL_STORAGE_KEYS.STUDENTS, JSON.stringify(students));
            return { success: true, student: newStudent };

        } catch (err) {
            console.error("नोंदणी प्रक्रिया अपवाद:", err);
            return { success: false, message: 'नोंदणी त्रुटी: ' + (err.message || 'तांत्रिक अडचण आली') };
        }
    }
};

window.DB = DB;
window.Auth = Auth;
window.hashPassword = hashPassword;
window.generateUUID = generateUUID;
window.isSupabaseActive = isSupabaseActive;
