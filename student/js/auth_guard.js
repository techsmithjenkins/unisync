// student/js/auth_guard.js
export function checkAuth() {
    const role = localStorage.getItem('user_role');
    const indexNumber = localStorage.getItem('user_index'); // or 'user_index_number' based on login

    if (role !== 'student' || !indexNumber) {
        // Not a student? Go back to login.
        window.location.href = '../index.html';
        return null;
    }
    return indexNumber;
}