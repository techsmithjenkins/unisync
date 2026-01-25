// Z:\unisync-project\shared\js\api\user_api.js
import supabase from '../supabase_client.js';

export const userAPI = {
    
    // Count total students
    getStudentCount: async () => {
        const { count, error } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true }) // 'head: true' means don't download data, just count
            .eq('role', 'student');
            
        if (error) {
            console.error("Error counting students:", error);
            return 0;
        }
        return count;
    }
};