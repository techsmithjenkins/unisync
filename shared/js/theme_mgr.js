export const initTheme = () => {
    const savedTheme = localStorage.getItem('unisync-theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }
};

export const toggleTheme = () => {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('unisync-theme', isDark ? 'dark' : 'light');
    return isDark;
};