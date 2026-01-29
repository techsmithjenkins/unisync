// shared/js/api/auth_api.js
import supabase from '../supabase_client.js';

export const authAPI = {
    
    // 1. Existing Login Function
    login: async (identifier, password) => {
        try {
            const { data: student, error: dbError } = await supabase
                .from('profiles')
                .select('id, index_number, full_name, status')
                .eq('index_number', identifier)
                .eq('password', password)
                .maybeSingle();

            if (student) {
                if (student.status === 'Inactive') {
                    throw new Error("Access Denied: Your account is inactive.");
                }
                localStorage.setItem('user_role', 'student');
                localStorage.setItem('user_id', student.id);
                localStorage.setItem('user_index', student.index_number);
                return { user: student, role: 'student' };
            }

            const { data: admin, error: authError } = await supabase.auth.signInWithPassword({
                email: identifier,
                password: password
            });

            if (admin.user) {
                localStorage.setItem('user_role', 'admin');
                return { user: admin.user, role: 'admin' };
            }

            throw new Error("Invalid Index Number or Password.");
        } catch (err) {
            console.error("Login Error:", err.message);
            return { error: err.message };
        }
    },

    // 2. NEW: Find Email by constructing it from Index Number
    findEmailByIndex: async (indexNumber) => {
        try {
            // Check if the student exists in our profiles table first
            const { data, error } = await supabase
                .from('profiles')
                .select('index_number')
                .eq('index_number', indexNumber)
                .maybeSingle();

            if (error) throw error;
            if (!data) throw new Error("Index Number not found in our records.");

            // Dynamically construct the GCTU student email
            const studentEmail = `${data.index_number}@live.gctu.edu.gh`;
            return { email: studentEmail, error: null };
        } catch (err) {
            return { email: null, error: err.message };
        }
    },

    // 3. NEW: Send Supabase Reset Link
    sendResetLink: async (email) => {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/reset-password.html', 
            });
            if (error) throw error;
            return { success: true, error: null };
        } catch (err) {
            return { success: false, error: err };
        }
    },

    // 4. Logout Function
    logout: async () => {
        localStorage.removeItem('user_role');
        localStorage.removeItem('user_id');
        localStorage.removeItem('user_index');
        await supabase.auth.signOut();
        window.location.href = '../index.html';
    },

    // 5. Check Session
    getCurrentUser: async () => {
        const role = localStorage.getItem('user_role');
        if (role === 'student') {
            return { 
                id: localStorage.getItem('user_id'),
                index_number: localStorage.getItem('user_index'),
                role: 'student' 
            };
        }
        const { data } = await supabase.auth.getUser();
        return data.user || null;
    }
};