// Z:\unisync-project\shared\js\api\auth_api.js

import supabase from '../supabase_client.js';

export const authAPI = {
    
    // 1. The Unified Login Function (Handles Students & Admins)
    login: async (identifier, password) => {
        try {
            // --- CHECK 1: Is it a Student? (Database Check) ---
            // We search the 'profiles' table directly for a matching Index Number + Password
            const { data: student, error: dbError } = await supabase
                .from('profiles')
                .select('id, index_number, full_name, status')
                .eq('index_number', identifier)
                .eq('password', password)
                .maybeSingle(); // Returns null if not found, instead of error

            if (student) {
                // SUCCESS: Found a student!
                if (student.status === 'Inactive') {
                    throw new Error("Access Denied: Your account is inactive.");
                }

                // 1. Save Student Session to Local Storage manually
                localStorage.setItem('user_role', 'student');
                localStorage.setItem('user_id', student.id);
                localStorage.setItem('user_index', student.index_number);
                
                return { user: student, role: 'student' };
            }

            // --- CHECK 2: Is it an Admin? (Auth System Check) ---
            // If DB check failed, try signing in with Email/Password
            const { data: admin, error: authError } = await supabase.auth.signInWithPassword({
                email: identifier,
                password: password
            });

            if (admin.user) {
                // SUCCESS: Found an Admin!
                localStorage.setItem('user_role', 'admin');
                return { user: admin.user, role: 'admin' };
            }

            // --- FAILURE ---
            throw new Error("Invalid Index Number or Password.");

        } catch (err) {
            console.error("Login Error:", err.message);
            return { error: err.message };
        }
    },

    // 2. The Logout Function
    logout: async () => {
        // Clear Local Storage (For Students)
        localStorage.removeItem('user_role');
        localStorage.removeItem('user_id');
        localStorage.removeItem('user_index');
        
        // Clear Supabase Session (For Admins)
        await supabase.auth.signOut();
        
        // Redirect
        window.location.href = '../index.html';
    },

    // 3. Check if user is already logged in
    getCurrentUser: async () => {
        // A. Check Local Storage first (Student)
        const role = localStorage.getItem('user_role');
        if (role === 'student') {
            return { 
                id: localStorage.getItem('user_id'),
                index_number: localStorage.getItem('user_index'),
                role: 'student' 
            };
        }

        // B. Check Supabase Auth (Admin)
        const { data } = await supabase.auth.getUser();
        return data.user || null;
    }
};