const SUPABASE_URL = "https://xozztctahqweeclgsovy.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_IsvtrSCXnTovYoxqkkuJxw_8qytZqkE";

// Initialize the Supabase client properly
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let currentUser = null;
let currentFiles = [];
let uploadTasks = new Map();
let searchTimeout = null;

// Utility functions
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showError(message, duration = 5000) {
    let msg = document.getElementById('auth-msg');
    let isToast = false;
    if (!msg) {
        msg = document.createElement('div');
        msg.className = 'toast-msg error';
        msg.style.position = 'fixed';
        msg.style.bottom = '20px';
        msg.style.right = '20px';
        msg.style.padding = '12px 24px';
        msg.style.background = 'var(--elev)';
        msg.style.color = 'var(--error)';
        msg.style.borderRadius = '8px';
        msg.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
        msg.style.zIndex = '9999';
        document.body.appendChild(msg);
        isToast = true;
    }
    msg.textContent = message;
    if (!isToast) msg.style.color = 'var(--error)';
    setTimeout(() => {
        if (isToast) msg.remove();
        else msg.textContent = '';
    }, duration);
}

function showSuccess(message, duration = 5000) {
    let msg = document.getElementById('auth-msg');
    let isToast = false;
    if (!msg) {
        msg = document.createElement('div');
        msg.className = 'toast-msg success';
        msg.style.position = 'fixed';
        msg.style.bottom = '20px';
        msg.style.right = '20px';
        msg.style.padding = '12px 24px';
        msg.style.background = 'var(--elev)';
        msg.style.color = 'var(--success)';
        msg.style.borderRadius = '8px';
        msg.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
        msg.style.zIndex = '9999';
        document.body.appendChild(msg);
        isToast = true;
    }
    msg.textContent = message;
    if (!isToast) msg.style.color = 'var(--success)';
    setTimeout(() => {
        if (isToast) msg.remove();
        else msg.textContent = '';
    }, duration);
}

// Auth Functions
async function handleAuth(isLogin = true) {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
        showError('Please enter both email and password');
        return;
    }

    try {
        if (isLogin) {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });
            
            if (error) throw error;
            
            if (data.user) {
                showSuccess('Login successful!');
                setTimeout(() => {
                    window.location.href = 'files.html';
                }, 1000);
            }
        } else {
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    emailRedirectTo: window.location.origin
                }
            });
            
            if (error) throw error;
            
            if (data.user?.identities?.length === 0) {
                showError('This email is already registered. Please log in instead.');
            } else {
                showSuccess('Account created! Please check your email for verification.');
            }
        }
    } catch (error) {
        console.error('Auth error:', error);
        showError(error.message);
    }
}

async function checkAuth() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) throw error;
        
        if (!user) {
            window.location.href = 'index.html';
            return false;
        }
        
        currentUser = user;
        return true;
    } catch (error) {
        console.error('Auth check error:', error);
        window.location.href = 'index.html';
        return false;
    }
}

async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
}

// File Management Functions
function getFileIcon(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    const icons = {
        pdf: 'file-pdf',
        doc: 'file-word', docx: 'file-word',
        xls: 'file-excel', xlsx: 'file-excel',
        ppt: 'file-powerpoint', pptx: 'file-powerpoint',
        jpg: 'file-image', jpeg: 'file-image', png: 'file-image', gif: 'file-image',
        mp3: 'file-audio', wav: 'file-audio',
        mp4: 'file-video', mov: 'file-video',
        zip: 'file-archive', rar: 'file-archive', '7z': 'file-archive',
        txt: 'file-alt',
        default: 'file'
    };
    return icons[ext] || icons.default;
}

function createFileCard(file) {
    const fileIcon = getFileIcon(file.name);
    return `
        <div class="file-card reveal" data-file-path="${file.name}">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                <i class="fas fa-${fileIcon} fa-2x" style="color: var(--accent);"></i>
                <div style="overflow: hidden;">
                    <div style="font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${file.name}</div>
                    <div style="color: var(--muted); font-size: 0.875rem;">${formatFileSize(file.metadata.size)}</div>
                </div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; color: var(--muted); font-size: 0.875rem;">
                <span>${formatDate(file.created_at)}</span>
                <div style="display: flex; gap: 8px;">
                    <button class="preview-btn" style="padding: 4px 8px;"><i class="fas fa-eye"></i></button>
                    <button class="download-btn" style="padding: 4px 8px;"><i class="fas fa-download"></i></button>
                    <button class="delete-btn" style="padding: 4px 8px;"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        </div>
    `;
}

async function loadFiles(searchQuery = '', sortBy = 'name-asc') {
    if (!await checkAuth()) return;

    const filesList = document.getElementById('files-list');
    try {
        const response = await fetch('/proxy-list', {
            headers: { 'x-user-id': currentUser.id }
        });
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.error || 'Failed to fetch files');

        if (!data || data.length === 0) {
            filesList.innerHTML = '<div class="reveal" style="text-align: center; color: var(--muted);"><i class="fas fa-folder-open fa-3x"></i><p style="margin-top: 16px;">No files found</p></div>';
            return;
        }

        currentFiles = data.filter(file => 
            file.name.toLowerCase().includes(searchQuery.toLowerCase())
        );

        const [sortField, sortOrder] = sortBy.split('-');
        currentFiles.sort((a, b) => {
            let comparison;
            switch (sortField) {
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                case 'date':
                    comparison = new Date(a.created_at) - new Date(b.created_at);
                    break;
                case 'size':
                    comparison = a.metadata.size - b.metadata.size;
                    break;
                default:
                    comparison = 0;
            }
            return sortOrder === 'desc' ? -comparison : comparison;
        });

        filesList.innerHTML = currentFiles.length 
            ? currentFiles.map(createFileCard).join('')
            : '<div class="reveal" style="text-align: center; color: var(--muted);"><i class="fas fa-folder-open fa-3x"></i><p style="margin-top: 16px;">No files found</p></div>';

        // Add event listeners to new cards
        document.querySelectorAll('.preview-btn').forEach(btn => 
            btn.addEventListener('click', () => handlePreview(btn.closest('.file-card').dataset.filePath))
        );
        document.querySelectorAll('.download-btn').forEach(btn => 
            btn.addEventListener('click', () => handleDownload(btn.closest('.file-card').dataset.filePath))
        );
        document.querySelectorAll('.delete-btn').forEach(btn => 
            btn.addEventListener('click', () => handleDelete(btn.closest('.file-card').dataset.filePath))
        );
    } catch (error) {
        showError('Error loading files: ' + error.message);
    }
}

async function handlePreview(filePath) {
    try {
        const modal = document.getElementById('preview-modal');
        const filename = document.getElementById('preview-filename');
        const content = document.getElementById('preview-content');
        const downloadBtn = document.getElementById('preview-download');
        const deleteBtn = document.getElementById('preview-delete');

        filename.textContent = filePath;
        modal.classList.add('active');

    const { data, error } = await supabase.storage
      .from('user-files')
      .download(`${currentUser.id}/${filePath}`);

        if (error) throw error;

        const ext = filePath.split('.').pop().toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) {
            const url = URL.createObjectURL(data);
            content.innerHTML = `<img src="${url}" style="max-width: 100%; height: auto;">`;
        } else if (['mp4', 'mov', 'webm'].includes(ext)) {
            const url = URL.createObjectURL(data);
            content.innerHTML = `<video controls style="max-width: 100%;"><source src="${url}"></video>`;
        } else if (['mp3', 'wav'].includes(ext)) {
            const url = URL.createObjectURL(data);
            content.innerHTML = `<audio controls style="width: 100%;"><source src="${url}"></audio>`;
        } else {
            content.innerHTML = `<div style="padding: 20px; background: var(--elev); border-radius: 8px;">
                <i class="fas fa-${getFileIcon(filePath)} fa-3x" style="color: var(--accent);"></i>
                <p style="margin-top: 16px;">Preview not available for this file type</p>
            </div>`;
        }

        downloadBtn.onclick = () => handleDownload(filePath);
        deleteBtn.onclick = () => {
            modal.classList.remove('active');
            handleDelete(filePath);
        };
    } catch (error) {
        showError('Error previewing file: ' + error.message);
    }
}

async function handleDownload(filePath) {
    try {
    const { data, error } = await supabase.storage
      .from('user-files')
      .download(`${currentUser.id}/${filePath}`);

        if (error) throw error;

        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = filePath;
        a.click();
        URL.revokeObjectURL(url);
    } catch (error) {
        showError('Error downloading file: ' + error.message);
    }
}

async function handleDelete(filePath) {
    const modal = document.getElementById('delete-modal');
    const filename = document.getElementById('delete-filename');
    const confirmBtn = document.getElementById('confirm-delete');
    const cancelBtn = document.getElementById('cancel-delete');

    console.log('Initiating delete for:', filePath);

    filename.textContent = filePath;
    modal.classList.add('active');

    confirmBtn.onclick = async () => {
        try {
            const fullPath = `${currentUser.id}/${filePath}`;
            console.log('Deleting file:', fullPath);

      const { error } = await supabase.storage
        .from('user-files')
        .remove([fullPath]);

            if (error) {
                console.error('Delete error:', error);
                throw error;
            }

            console.log('File deleted successfully:', filePath);
            modal.classList.remove('active');
            showSuccess('File deleted successfully');
            await loadFiles(); // Reload the file list
        } catch (error) {
            console.error('Delete error:', error);
            showError('Error deleting file: ' + error.message);
        }
    };

    cancelBtn.onclick = () => modal.classList.remove('active');
}

// Upload Functions
function createProgressElement(file) {
    return `
        <div class="file-progress" data-file="${file.name}">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-${getFileIcon(file.name)}"></i>
                    <span style="font-weight: 500;">${file.name}</span>
                </div>
                <span class="progress-percentage">0%</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: 0%"></div>
            </div>
        </div>
    `;
}

function updateProgress(fileName, progress) {
    const element = document.querySelector(`[data-file="${fileName}"]`);
    if (element) {
        element.querySelector('.progress-percentage').textContent = `${Math.round(progress)}%`;
        element.querySelector('.progress-fill').style.width = `${progress}%`;
    }
}

async function handleUpload(files) {
    if (!await checkAuth()) return;

    const progressSection = document.getElementById('upload-progress-section');
    const progressList = document.getElementById('upload-progress-list');
    
    progressSection.style.display = 'block';
    files = Array.from(files);

    // Create progress elements
    progressList.innerHTML = files.map(createProgressElement).join('');

    // Upload each file
    const uploads = files.map(async file => {
        try {
      // Use server-side proxy to bypass RLS security policies
      const response = await fetch('/proxy-upload', {
        method: 'POST',
        headers: {
            'x-file-name': file.name,
            'x-user-id': currentUser.id,
            'content-type': file.type || 'application/octet-stream'
        },
        body: file
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Server proxy failed');

      console.log('Upload success via proxy:', result);
            
            const progressElement = document.querySelector(`[data-file="${file.name}"]`);
            progressElement.style.animation = 'fadeOut 0.5s ease forwards';
            setTimeout(() => progressElement.remove(), 500);

        } catch (error) {
            console.error('Upload Error Details:', error);
            showError(`Error uploading ${file.name}: ${error.message}. Check your Supabase Storage Policies.`);
            const progressElement = document.querySelector(`[data-file="${file.name}"]`);
            if (progressElement) {
                progressElement.style.color = 'var(--error)';
                progressElement.querySelector('.progress-percentage').textContent = 'Failed';
                const progressFill = progressElement.querySelector('.progress-fill');
                if (progressFill) progressFill.style.backgroundColor = 'var(--error)';
                
                // Keep the error message permanently visible under the failing file
                const errorDetails = document.createElement('div');
                errorDetails.style.color = 'var(--error)';
                errorDetails.style.fontSize = '12px';
                errorDetails.style.marginTop = '8px';
                errorDetails.style.wordBreak = 'break-word';
                errorDetails.innerText = `Details: ${error.message || JSON.stringify(error)}`;
                progressElement.appendChild(errorDetails);
            }
        }
    });

    await Promise.all(uploads);
    
    if (!progressList.children.length) {
        progressSection.style.display = 'none';
    }

    loadFiles();
}

// Event Listeners
document.addEventListener('DOMContentLoaded', async () => {
    // Common elements
    const authForm = document.getElementById('auth-section');
    const authLoginBtn = document.getElementById('login-btn');
    const authSignupBtn = document.getElementById('signup-btn');
    
    // If we're on the login page
    if (authForm && authLoginBtn && authSignupBtn) {
        // Prevent form submission
        authForm.addEventListener('submit', (e) => {
            e.preventDefault();
        });

        // Add authentication handlers
        authLoginBtn.addEventListener('click', () => handleAuth(true));
        authSignupBtn.addEventListener('click', () => handleAuth(false));

        // Add enter key handler on password field
        const passwordInput = document.getElementById('password');
        if (passwordInput) {
            passwordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    handleAuth(true);
                }
            });
        }

        return; // Exit early for login page
    }
    // Auth page
    const loginBtn = document.getElementById('login-btn');
    const signupBtn = document.getElementById('signup-btn');
    if (loginBtn && signupBtn) {
        loginBtn.addEventListener('click', () => handleAuth(true));
        signupBtn.addEventListener('click', () => handleAuth(false));
        return;
    }

    // Files page
    if (!await checkAuth()) return;

    // Search functionality
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                loadFiles(e.target.value, document.getElementById('sort-select').value);
            }, 300);
        });
    }

    // Sort functionality
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            loadFiles(document.getElementById('search-input').value, e.target.value);
        });
    }

    // Upload area
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');
    const browseBtn = document.getElementById('browse-btn');
    
    if (uploadArea && fileInput && browseBtn) {
        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('drag-over');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            handleUpload(e.dataTransfer.files);
        });

        // Browse button
        browseBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', () => handleUpload(fileInput.files));
    }

    // Modal close buttons
    document.querySelectorAll('#close-preview, #preview-modal').forEach(element => {
        element.addEventListener('click', (e) => {
            if (e.target === element) {
                document.getElementById('preview-modal').classList.remove('active');
            }
        });
    });

    // Minimize upload section
    const minimizeUpload = document.getElementById('minimize-upload');
    if (minimizeUpload) {
        minimizeUpload.addEventListener('click', () => {
            document.getElementById('upload-progress-section').style.display = 'none';
        });
    }

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Initial load
    loadFiles();
});

