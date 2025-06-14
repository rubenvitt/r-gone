// Popup Script for If I'm Gone Browser Extension

// State management
const state = {
  isConnected: false,
  isUnlocked: false,
  currentTab: null,
  passwords: [],
  filteredPasswords: []
};

// DOM Elements
const elements = {
  connectionStatus: document.getElementById('connection-status'),
  statusText: document.querySelector('.status-text'),
  mainContent: document.getElementById('main-content'),
  loginView: document.getElementById('login-view'),
  vaultView: document.getElementById('vault-view'),
  generatorView: document.getElementById('generator-view'),
  savePasswordView: document.getElementById('save-password-view'),
  footer: document.getElementById('footer'),
  
  // Forms
  loginForm: document.getElementById('login-form'),
  savePasswordForm: document.getElementById('save-password-form'),
  
  // Inputs
  masterPassword: document.getElementById('master-password'),
  searchInput: document.getElementById('search-input'),
  generatedPassword: document.getElementById('generated-password'),
  passwordLength: document.getElementById('password-length'),
  lengthValue: document.getElementById('length-value'),
  
  // Buttons
  settingsBtn: document.getElementById('settings-btn'),
  generatePasswordBtn: document.getElementById('generate-password-btn'),
  savePasswordBtn: document.getElementById('save-password-btn'),
  copyPasswordBtn: document.getElementById('copy-password-btn'),
  regenerateBtn: document.getElementById('regenerate-btn'),
  usePasswordBtn: document.getElementById('use-password-btn'),
  backToVaultBtn: document.getElementById('back-to-vault-btn'),
  cancelSaveBtn: document.getElementById('cancel-save-btn'),
  togglePasswordBtn: document.getElementById('toggle-password-btn'),
  lockVaultBtn: document.getElementById('lock-vault-btn'),
  openDashboardBtn: document.getElementById('open-dashboard'),
  forgotPasswordLink: document.getElementById('forgot-password'),
  
  // Password lists
  currentSitePasswords: document.getElementById('current-site-passwords'),
  allPasswords: document.getElementById('all-passwords')
};

// Initialize popup
async function init() {
  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  state.currentTab = tab;
  
  // Check connection to main app
  checkConnection();
  
  // Setup event listeners
  setupEventListeners();
  
  // Check if already unlocked
  checkUnlockStatus();
}

// Check connection to main application
async function checkConnection() {
  try {
    // Send message to background script
    const response = await chrome.runtime.sendMessage({ type: 'CHECK_CONNECTION' });
    
    if (response && response.connected) {
      state.isConnected = true;
      elements.connectionStatus.classList.add('connected');
      elements.statusText.textContent = 'Connected to vault';
    } else {
      throw new Error('Not connected');
    }
  } catch (error) {
    state.isConnected = false;
    elements.connectionStatus.classList.add('error');
    elements.statusText.textContent = 'Not connected to If I\'m Gone';
  }
}

// Check if vault is already unlocked
async function checkUnlockStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'CHECK_UNLOCK_STATUS' });
    
    if (response && response.unlocked) {
      state.isUnlocked = true;
      showVaultView();
      loadPasswords();
    } else {
      showLoginView();
    }
  } catch (error) {
    console.error('Error checking unlock status:', error);
    showLoginView();
  }
}

// Setup event listeners
function setupEventListeners() {
  // Login form
  elements.loginForm.addEventListener('submit', handleLogin);
  
  // Search
  elements.searchInput.addEventListener('input', handleSearch);
  
  // Generator
  elements.generatePasswordBtn.addEventListener('click', showGeneratorView);
  elements.regenerateBtn.addEventListener('click', generatePassword);
  elements.copyPasswordBtn.addEventListener('click', copyGeneratedPassword);
  elements.usePasswordBtn.addEventListener('click', useGeneratedPassword);
  elements.backToVaultBtn.addEventListener('click', showVaultView);
  elements.passwordLength.addEventListener('input', updatePasswordLength);
  
  // Save password
  elements.savePasswordBtn.addEventListener('click', showSavePasswordView);
  elements.savePasswordForm.addEventListener('submit', handleSavePassword);
  elements.cancelSaveBtn.addEventListener('click', showVaultView);
  elements.togglePasswordBtn.addEventListener('click', togglePasswordVisibility);
  
  // Other buttons
  elements.settingsBtn.addEventListener('click', openSettings);
  elements.lockVaultBtn.addEventListener('click', lockVault);
  elements.openDashboardBtn.addEventListener('click', openDashboard);
  elements.forgotPasswordLink.addEventListener('click', handleForgotPassword);
}

// Handle login
async function handleLogin(e) {
  e.preventDefault();
  
  const password = elements.masterPassword.value;
  
  try {
    // Send unlock request to background script
    const response = await chrome.runtime.sendMessage({
      type: 'UNLOCK_VAULT',
      password
    });
    
    if (response && response.success) {
      state.isUnlocked = true;
      elements.masterPassword.value = '';
      showVaultView();
      loadPasswords();
    } else {
      showError('Invalid master password');
    }
  } catch (error) {
    console.error('Login error:', error);
    showError('Failed to unlock vault');
  }
}

// Load passwords from vault
async function loadPasswords() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_PASSWORDS' });
    
    if (response && response.passwords) {
      state.passwords = response.passwords;
      displayPasswords();
    }
  } catch (error) {
    console.error('Error loading passwords:', error);
  }
}

// Display passwords
function displayPasswords() {
  const currentDomain = extractDomain(state.currentTab.url);
  const currentSitePasswords = state.passwords.filter(p => 
    extractDomain(p.url) === currentDomain
  );
  
  // Display current site passwords
  if (currentSitePasswords.length > 0) {
    elements.currentSitePasswords.innerHTML = currentSitePasswords
      .map(password => createPasswordItem(password, true))
      .join('');
    document.getElementById('current-site-section').classList.remove('hidden');
  } else {
    document.getElementById('current-site-section').classList.add('hidden');
  }
  
  // Display all passwords
  const otherPasswords = state.passwords.filter(p => 
    extractDomain(p.url) !== currentDomain
  );
  
  if (otherPasswords.length > 0) {
    elements.allPasswords.innerHTML = otherPasswords
      .map(password => createPasswordItem(password, false))
      .join('');
  } else {
    elements.allPasswords.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <rect x="5" y="11" width="14" height="10" rx="2" ry="2"></rect>
          <circle cx="12" cy="16" r="1"></circle>
          <path d="M8 11V7a4 4 0 018 0v4"></path>
        </svg>
        <p>No passwords saved yet</p>
        <button class="btn btn-primary" onclick="showSavePasswordView()">
          Add First Password
        </button>
      </div>
    `;
  }
}

// Create password item HTML
function createPasswordItem(password, isCurrentSite) {
  const favicon = getFavicon(password.url);
  
  return `
    <div class="password-item" data-id="${password.id}">
      <div class="password-item-icon">
        <img src="${favicon}" alt="" onerror="this.src='../../assets/icons/default-site.png'">
      </div>
      <div class="password-item-details">
        <div class="password-item-title">${password.name}</div>
        <div class="password-item-username">${password.username}</div>
      </div>
      <div class="password-item-actions">
        ${isCurrentSite ? `
          <button class="icon-btn" onclick="fillPassword('${password.id}')" title="Auto-fill">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
          </button>
        ` : ''}
        <button class="icon-btn" onclick="copyPassword('${password.id}')" title="Copy password">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
          </svg>
        </button>
      </div>
    </div>
  `;
}

// Handle search
function handleSearch() {
  const query = elements.searchInput.value.toLowerCase();
  
  if (query) {
    state.filteredPasswords = state.passwords.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.username.toLowerCase().includes(query) ||
      p.url.toLowerCase().includes(query)
    );
  } else {
    state.filteredPasswords = state.passwords;
  }
  
  displayPasswords();
}

// Fill password on current page
async function fillPassword(passwordId) {
  try {
    await chrome.runtime.sendMessage({
      type: 'FILL_PASSWORD',
      passwordId,
      tabId: state.currentTab.id
    });
    
    // Close popup after filling
    window.close();
  } catch (error) {
    console.error('Error filling password:', error);
    showError('Failed to fill password');
  }
}

// Copy password to clipboard
async function copyPassword(passwordId) {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_PASSWORD',
      passwordId
    });
    
    if (response && response.password) {
      await navigator.clipboard.writeText(response.password);
      showSuccess('Password copied to clipboard');
    }
  } catch (error) {
    console.error('Error copying password:', error);
    showError('Failed to copy password');
  }
}

// Generate password
function generatePassword() {
  const length = parseInt(elements.passwordLength.value);
  const includeUppercase = document.getElementById('include-uppercase').checked;
  const includeLowercase = document.getElementById('include-lowercase').checked;
  const includeNumbers = document.getElementById('include-numbers').checked;
  const includeSymbols = document.getElementById('include-symbols').checked;
  
  let charset = '';
  if (includeUppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (includeLowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
  if (includeNumbers) charset += '0123456789';
  if (includeSymbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  if (!charset) {
    showError('Please select at least one character type');
    return;
  }
  
  let password = '';
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  
  for (let i = 0; i < length; i++) {
    password += charset[array[i] % charset.length];
  }
  
  elements.generatedPassword.value = password;
}

// Handle save password
async function handleSavePassword(e) {
  e.preventDefault();
  
  const passwordData = {
    name: document.getElementById('site-name').value,
    url: document.getElementById('site-url').value,
    username: document.getElementById('username').value,
    password: document.getElementById('password').value,
    notes: document.getElementById('notes').value
  };
  
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'SAVE_PASSWORD',
      passwordData
    });
    
    if (response && response.success) {
      showSuccess('Password saved successfully');
      elements.savePasswordForm.reset();
      showVaultView();
      loadPasswords();
    } else {
      showError('Failed to save password');
    }
  } catch (error) {
    console.error('Error saving password:', error);
    showError('Failed to save password');
  }
}

// View switching functions
function showView(viewId) {
  document.querySelectorAll('.view').forEach(view => {
    view.classList.add('hidden');
  });
  
  document.getElementById(viewId).classList.remove('hidden');
  
  // Show/hide footer based on unlock status
  if (state.isUnlocked && viewId !== 'login-view') {
    elements.footer.classList.remove('hidden');
  } else {
    elements.footer.classList.add('hidden');
  }
}

function showLoginView() {
  showView('login-view');
}

function showVaultView() {
  showView('vault-view');
  if (state.passwords.length === 0) {
    loadPasswords();
  }
}

function showGeneratorView() {
  showView('generator-view');
  generatePassword();
}

function showSavePasswordView() {
  showView('save-password-view');
  
  // Pre-fill URL if on a website
  if (state.currentTab && state.currentTab.url) {
    document.getElementById('site-url').value = state.currentTab.url;
    document.getElementById('site-name').value = extractDomain(state.currentTab.url);
  }
}

// Utility functions
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return '';
  }
}

function getFavicon(url) {
  try {
    const urlObj = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
  } catch {
    return '../../assets/icons/default-site.png';
  }
}

function updatePasswordLength() {
  elements.lengthValue.textContent = elements.passwordLength.value;
  generatePassword();
}

function togglePasswordVisibility() {
  const passwordInput = document.getElementById('password');
  const type = passwordInput.type === 'password' ? 'text' : 'password';
  passwordInput.type = type;
}

function copyGeneratedPassword() {
  navigator.clipboard.writeText(elements.generatedPassword.value);
  showSuccess('Password copied to clipboard');
}

function useGeneratedPassword() {
  document.getElementById('password').value = elements.generatedPassword.value;
  showSavePasswordView();
}

async function lockVault() {
  await chrome.runtime.sendMessage({ type: 'LOCK_VAULT' });
  state.isUnlocked = false;
  state.passwords = [];
  showLoginView();
}

function openSettings() {
  chrome.runtime.openOptionsPage();
}

function openDashboard() {
  chrome.tabs.create({ url: 'http://localhost:3001' });
}

function handleForgotPassword(e) {
  e.preventDefault();
  chrome.tabs.create({ url: 'http://localhost:3001/forgot-password' });
}

// Notification functions
function showError(message) {
  showNotification(message, 'error');
}

function showSuccess(message) {
  showNotification(message, 'success');
}

function showNotification(message, type) {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  // Add to body
  document.body.appendChild(notification);
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Add notification styles
const style = document.createElement('style');
style.textContent = `
  .notification {
    position: fixed;
    top: 16px;
    right: 16px;
    padding: 12px 16px;
    border-radius: 6px;
    color: white;
    font-weight: 500;
    z-index: 1000;
    animation: slideIn 0.3s ease-out;
  }
  
  .notification.success {
    background: #10b981;
  }
  
  .notification.error {
    background: #ef4444;
  }
  
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;
document.head.appendChild(style);

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', init);