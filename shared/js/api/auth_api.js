import supabase from '../supabase_client.js';

export const authAPI = {
    
    /**
     * 1. Unified Login Function
     * Handles both Students (Index Number) and Admins (Email)
     * Now strictly uses Supabase Auth for security.
     */
    login: async (identifier, password) => {
        try {
            let email = identifier.trim().toLowerCase();
            if (!email.includes('@')) {
                email = `${identifier}@live.gctu.edu.gh`;
            }

            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (authError) throw authError;

            const user = data.user;
            const role = user.user_metadata.role || 'student';

            if (role === 'student') {
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('status, index_number')
                    .eq('id', user.id)
                    .maybeSingle();

                if (profile && profile.status === 'Inactive') {
                    await supabase.auth.signOut();
                    throw new Error("Access Denied: Your account is inactive.");
                }
                
                localStorage.setItem('user_index', profile ? profile.index_number : identifier);
            }

            localStorage.setItem('user_role', role);
            localStorage.setItem('user_id', user.id);
            
            return { user, role };

        } catch (err) {
            console.error("Login Error:", err.message);
            const msg = err.message === 'Invalid login credentials' 
                ? "Invalid Index Number/Email or Password." 
                : err.message;
            return { error: msg };
        }
    },

    /**
     * 2. Find Email by Index
     * Used in the Forgot Password flow to identify the target email.
     */
    findEmailByIndex: async (identifier) => {
        try {
            const isEmail = identifier.includes('@');

            if (isEmail) {
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('index_number', identifier)
                    .maybeSingle();

                if (error) throw error;

                if (!profile || profile.role !== 'admin') {
                    throw new Error("Student accounts must use their Index Number, not an email address.");
                }

                return { email: identifier, error: null };
            } else {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('index_number')
                    .eq('index_number', identifier)
                    .maybeSingle();

                if (error) throw error;
                if (!data) throw new Error("Index Number not found in our records.");

                const studentEmail = `${data.index_number}@live.gctu.edu.gh`;
                return { email: studentEmail, error: null };
            }
        } catch (err) {
            return { email: null, error: err.message };
        }
    },

    /**
     * 3. Send Reset Link
     * Triggers the Supabase recovery email.
     */
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

    /**
     * 4. Logout Function
     * Clears all session data and signs out of Supabase.
     */
    logout: async () => {
        localStorage.removeItem('user_role');
        localStorage.removeItem('user_id');
        localStorage.removeItem('user_index');

        await supabase.auth.signOut();
        window.location.href = '../index.html';
    },

    /**
     * 5. Get Current User Session
     * Returns the active user and their role.
     */
    getCurrentUser: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        return {
            id: user.id,
            email: user.email,
            role: user.user_metadata.role || 'student',
            index_number: localStorage.getItem('user_index')
        };
    }
};