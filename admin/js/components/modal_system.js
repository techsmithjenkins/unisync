// Z:\unisync-project\admin\js\components\modal_system.js

export const Modal = {
    init() {
        if (document.getElementById('global-modal')) return; // Already exists

        // 1. Inject CSS/HTML
        const modalHtml = `
        <div id="global-modal" class="fixed inset-0 z-[999] hidden" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div id="global-modal-backdrop" class="fixed inset-0 bg-gray-900 bg-opacity-50 transition-opacity opacity-0"></div>

            <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
                <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                    
                    <div id="global-modal-panel" class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
                        
                        <div class="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                            <div class="sm:flex sm:items-start">
                                <div id="modal-icon-bg" class="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                                    <span id="modal-icon" class="text-2xl">⚠️</span>
                                </div>
                                
                                <div class="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                                    <h3 id="modal-title" class="text-base font-semibold leading-6 text-gray-900">Confirmation</h3>
                                    <div class="mt-2">
                                        <p id="modal-message" class="text-sm text-gray-500">Are you sure you want to proceed?</p>
                                        <input type="text" id="modal-input" class="hidden mt-3 w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-red-500 outline-none" placeholder="Type here...">
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                            <button type="button" id="modal-confirm-btn" class="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto">Confirm</button>
                            <button type="button" id="modal-cancel-btn" class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto">Cancel</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    /**
     * Show a Confirmation Dialog
     * @param {string} title - Header text
     * @param {string} message - Body text
     * @param {string} confirmText - Text for the confirm button (e.g. "Delete")
     * @param {string} color - 'red' or 'blue' or 'green'
     * @returns {Promise<boolean>} - Resolves true if confirmed, false if cancelled
     */
    async confirm(title, message, confirmText = 'Confirm', color = 'red') {
        this.init();
        return new Promise((resolve) => {
            const modal = document.getElementById('global-modal');
            const backdrop = document.getElementById('global-modal-backdrop');
            const panel = document.getElementById('global-modal-panel');
            const confirmBtn = document.getElementById('modal-confirm-btn');
            const cancelBtn = document.getElementById('modal-cancel-btn');
            const iconBg = document.getElementById('modal-icon-bg');
            const input = document.getElementById('modal-input');

            // 1. Setup Content
            document.getElementById('modal-title').innerText = title;
            document.getElementById('modal-message').innerText = message;
            confirmBtn.innerText = confirmText;
            input.classList.add('hidden'); // Hide input by default

            // 2. Setup Colors
            const colors = {
                red: { bg: 'bg-red-100', btn: 'bg-red-600 hover:bg-red-500', icon: '⚠️' },
                blue: { bg: 'bg-blue-100', btn: 'bg-blue-600 hover:bg-blue-500', icon: 'ℹ️' },
                green: { bg: 'bg-green-100', btn: 'bg-green-600 hover:bg-green-500', icon: '✅' }
            };
            const theme = colors[color] || colors.red;
            
            iconBg.className = `mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full sm:mx-0 sm:h-10 sm:w-10 ${theme.bg}`;
            confirmBtn.className = `inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm sm:ml-3 sm:w-auto ${theme.btn}`;
            document.getElementById('modal-icon').innerText = theme.icon;

            // 3. Show Modal (Animation)
            modal.classList.remove('hidden');
            // Small timeout to allow CSS transition
            setTimeout(() => {
                backdrop.classList.remove('opacity-0');
                panel.classList.remove('opacity-0', 'translate-y-4', 'sm:translate-y-0', 'sm:scale-95');
                panel.classList.add('opacity-100', 'translate-y-0', 'sm:scale-100');
            }, 10);

            // 4. Handlers
            const close = (result) => {
                backdrop.classList.add('opacity-0');
                panel.classList.add('opacity-0', 'translate-y-4', 'sm:translate-y-0', 'sm:scale-95');
                setTimeout(() => modal.classList.add('hidden'), 300); // Wait for anim
                
                // Cleanup listeners to avoid duplicates
                confirmBtn.onclick = null;
                cancelBtn.onclick = null;
                resolve(result);
            };

            confirmBtn.onclick = () => close(true);
            cancelBtn.onclick = () => close(false);
        });
    },

    /**
     * Show a "Type to Confirm" Dialog (For dangerous actions)
     */
    async dangerousConfirm(title, message, matchWord = 'DELETE') {
        this.init();
        return new Promise((resolve) => {
            const modal = document.getElementById('global-modal');
            const backdrop = document.getElementById('global-modal-backdrop');
            const panel = document.getElementById('global-modal-panel');
            const confirmBtn = document.getElementById('modal-confirm-btn');
            const cancelBtn = document.getElementById('modal-cancel-btn');
            const input = document.getElementById('modal-input');

            // Setup
            document.getElementById('modal-title').innerText = title;
            document.getElementById('modal-message').innerText = message + `\n\nType "${matchWord}" below to confirm.`;
            confirmBtn.innerText = "Delete Everything";
            
            // Show Input
            input.classList.remove('hidden');
            input.value = '';
            input.placeholder = `Type ${matchWord}`;
            
            // Set Red Theme
            document.getElementById('modal-icon-bg').className = "mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10";
            confirmBtn.className = "inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto opacity-50 cursor-not-allowed";
            confirmBtn.disabled = true;

            // Show
            modal.classList.remove('hidden');
            setTimeout(() => {
                backdrop.classList.remove('opacity-0');
                panel.classList.remove('opacity-0', 'translate-y-4', 'sm:scale-95');
                panel.classList.add('opacity-100', 'translate-y-0', 'sm:scale-100');
            }, 10);

            // Input Validation
            input.onkeyup = () => {
                if (input.value === matchWord) {
                    confirmBtn.disabled = false;
                    confirmBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                } else {
                    confirmBtn.disabled = true;
                    confirmBtn.classList.add('opacity-50', 'cursor-not-allowed');
                }
            };

            const close = (result) => {
                backdrop.classList.add('opacity-0');
                panel.classList.add('opacity-0', 'translate-y-4', 'sm:scale-95');
                setTimeout(() => modal.classList.add('hidden'), 300);
                resolve(result);
            };

            confirmBtn.onclick = () => close(true);
            cancelBtn.onclick = () => close(false);
        });
    }
};