// Background Service Worker for If I'm Gone Browser Extension

// Constants
const APP_URL = 'http://localhost:3001';
const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  VAULT_KEY: 'vault_key',
  CACHED_PASSWORDS: 'cached_passwords',
  SETTINGS: 'extension_settings'
};

// State
let isUnlocked = false;
let vaultKey = null;
let authToken = null;
let passwordCache = [];

// Initialize extension
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Extension installed:', details.reason);
  
  // Set default settings
  if (details.reason === 'install') {
    await chrome.storage.local.set({
      [STORAGE_KEYS.SETTINGS]: {
        autoFill: true,
        autoSave: true,
        showNotifications: true,
        lockTimeout: 15 // minutes
      }
    });
  }
  
  // Create context menu items
  createContextMenus();
});

// Create context menu items
function createContextMenus() {
  chrome.contextMenus.create({
    id: 'save-password',
    title: 'Save password to If I\'m Gone',
    contexts: ['password']
  });
  
  chrome.contextMenus.create({
    id: 'generate-password',
    title: 'Generate secure password',
    contexts: ['editable']
  });
}

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Received message:', request.type);
  
  switch (request.type) {
    case 'CHECK_CONNECTION':
      checkConnection().then(sendResponse);
      break;
      
    case 'CHECK_UNLOCK_STATUS':
      sendResponse({ unlocked: isUnlocked });
      break;
      
    case 'UNLOCK_VAULT':
      unlockVault(request.password).then(sendResponse);
      break;
      
    case 'LOCK_VAULT':
      lockVault();
      sendResponse({ success: true });
      break;
      
    case 'GET_PASSWORDS':
      getPasswords().then(sendResponse);
      break;
      
    case 'GET_PASSWORD':
      getPassword(request.passwordId).then(sendResponse);
      break;
      
    case 'SAVE_PASSWORD':
      savePassword(request.passwordData).then(sendResponse);
      break;
      
    case 'FILL_PASSWORD':
      fillPassword(request.passwordId, request.tabId).then(sendResponse);
      break;
      
    case 'CAPTURE_PASSWORD':
      capturePassword(request.data, sender.tab).then(sendResponse);
      break;
      
    case 'CHECK_PASSWORD_FIELDS':
      checkPasswordFields(sender.tab).then(sendResponse);
      break;
      
    default:
      sendResponse({ error: 'Unknown message type' });
  }
  
  // Return true to indicate async response
  return true;
});

// Check connection to main application
async function checkConnection() {
  try {
    const response = await fetch(`${APP_URL}/api/extension/ping`, {
      method: 'GET',
      headers: {
        'Authorization': authToken ? `Bearer ${authToken}` : ''
      }
    });
    
    return { connected: response.ok };
  } catch (error) {
    console.error('Connection check failed:', error);
    return { connected: false };
  }
}

// Unlock vault with master password
async function unlockVault(masterPassword) {
  try {
    // Authenticate with the main application
    const response = await fetch(`${APP_URL}/api/extension/unlock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ masterPassword })
    });
    
    if (!response.ok) {
      throw new Error('Invalid password');
    }
    
    const data = await response.json();
    
    // Store auth token and vault key
    authToken = data.token;
    vaultKey = data.vaultKey;
    isUnlocked = true;
    
    // Save to storage
    await chrome.storage.session.set({
      [STORAGE_KEYS.AUTH_TOKEN]: authToken,
      [STORAGE_KEYS.VAULT_KEY]: vaultKey
    });
    
    // Set lock timeout
    setLockTimeout();
    
    return { success: true };
  } catch (error) {
    console.error('Unlock failed:', error);
    return { success: false, error: error.message };
  }
}

// Lock vault
function lockVault() {
  isUnlocked = false;
  vaultKey = null;
  authToken = null;
  passwordCache = [];
  
  // Clear session storage
  chrome.storage.session.clear();
  
  // Clear any timeouts
  if (lockTimeoutId) {
    clearTimeout(lockTimeoutId);
  }
}

// Set automatic lock timeout
let lockTimeoutId = null;
async function setLockTimeout() {
  // Get settings
  const { [STORAGE_KEYS.SETTINGS]: settings } = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
  const timeout = settings.lockTimeout * 60 * 1000; // Convert to milliseconds
  
  // Clear existing timeout
  if (lockTimeoutId) {
    clearTimeout(lockTimeoutId);
  }
  
  // Set new timeout
  lockTimeoutId = setTimeout(() => {
    lockVault();
  }, timeout);
}

// Get all passwords
async function getPasswords() {
  if (!isUnlocked) {
    return { error: 'Vault is locked' };
  }
  
  try {
    const response = await fetch(`${APP_URL}/api/extension/passwords`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch passwords');
    }
    
    const data = await response.json();
    passwordCache = data.passwords;
    
    return { passwords: passwordCache };
  } catch (error) {
    console.error('Get passwords failed:', error);
    return { error: error.message };
  }
}

// Get specific password
async function getPassword(passwordId) {
  if (!isUnlocked) {
    return { error: 'Vault is locked' };
  }
  
  try {
    const response = await fetch(`${APP_URL}/api/extension/passwords/${passwordId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch password');
    }
    
    const data = await response.json();
    return { password: data.password };
  } catch (error) {
    console.error('Get password failed:', error);
    return { error: error.message };
  }
}

// Save new password
async function savePassword(passwordData) {
  if (!isUnlocked) {
    return { error: 'Vault is locked' };
  }
  
  try {
    const response = await fetch(`${APP_URL}/api/extension/passwords`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(passwordData)
    });
    
    if (!response.ok) {
      throw new Error('Failed to save password');
    }
    
    const data = await response.json();
    
    // Show notification
    showNotification('Password saved', `Password for ${passwordData.name} has been saved securely.`);
    
    return { success: true, passwordId: data.id };
  } catch (error) {
    console.error('Save password failed:', error);
    return { success: false, error: error.message };
  }
}

// Fill password on page
async function fillPassword(passwordId, tabId) {
  if (!isUnlocked) {
    return { error: 'Vault is locked' };
  }
  
  try {
    // Get password details
    const passwordResponse = await getPassword(passwordId);
    if (passwordResponse.error) {
      throw new Error(passwordResponse.error);
    }
    
    // Get cached password entry for username
    const passwordEntry = passwordCache.find(p => p.id === passwordId);
    if (!passwordEntry) {
      throw new Error('Password not found');
    }
    
    // Send to content script
    await chrome.tabs.sendMessage(tabId, {
      type: 'FILL_CREDENTIALS',
      data: {
        username: passwordEntry.username,
        password: passwordResponse.password
      }
    });
    
    return { success: true };
  } catch (error) {
    console.error('Fill password failed:', error);
    return { error: error.message };
  }
}

// Capture password from form submission
async function capturePassword(data, tab) {
  if (!isUnlocked) {
    return { error: 'Vault is locked' };
  }
  
  try {
    // Check if password already exists for this site
    const existingPassword = passwordCache.find(p => 
      new URL(p.url).hostname === new URL(tab.url).hostname &&
      p.username === data.username
    );
    
    if (existingPassword) {
      // Update existing password
      const response = await fetch(`${APP_URL}/api/extension/passwords/${existingPassword.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          ...existingPassword,
          password: data.password
        })
      });
      
      if (response.ok) {
        showNotification('Password updated', `Password for ${data.username} has been updated.`);
      }
    } else {
      // Show save prompt
      const settings = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
      if (settings[STORAGE_KEYS.SETTINGS].autoSave) {
        // Auto-save the password
        await savePassword({
          name: new URL(tab.url).hostname,
          url: tab.url,
          username: data.username,
          password: data.password
        });
      } else {
        // Show notification to save
        showNotification(
          'Save password?',
          `Would you like to save the password for ${data.username}?`,
          [
            { title: 'Save', action: 'save-captured-password', data }
          ]
        );
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Capture password failed:', error);
    return { error: error.message };
  }
}

// Check for password fields on page
async function checkPasswordFields(tab) {
  try {
    const hasFields = await chrome.tabs.sendMessage(tab.id, {
      type: 'CHECK_PASSWORD_FIELDS'
    });
    
    return hasFields;
  } catch (error) {
    console.error('Check password fields failed:', error);
    return { hasFields: false };
  }
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  switch (info.menuItemId) {
    case 'save-password':
      // Open popup to save password view
      chrome.action.openPopup();
      break;
      
    case 'generate-password':
      // Generate and insert password
      const password = generateSecurePassword();
      await chrome.tabs.sendMessage(tab.id, {
        type: 'INSERT_TEXT',
        text: password
      });
      break;
  }
});

// Generate secure password
function generateSecurePassword(length = 16) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset[array[i] % charset.length];
  }
  
  return password;
}

// Show notification
function showNotification(title, message, buttons = []) {
  const notificationOptions = {
    type: 'basic',
    iconUrl: '../../assets/icons/icon-128.png',
    title,
    message,
    priority: 2
  };
  
  if (buttons.length > 0) {
    notificationOptions.buttons = buttons.map(b => ({ title: b.title }));
  }
  
  chrome.notifications.create('', notificationOptions);
}

// Handle notification button clicks
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  // Handle notification actions
  console.log('Notification button clicked:', buttonIndex);
});

// Handle tab updates to check for password fields
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome://')) {
    // Check if page has password fields
    const hasFields = await checkPasswordFields(tab);
    
    if (hasFields.hasFields && isUnlocked) {
      // Update badge to show passwords available
      const passwords = passwordCache.filter(p => 
        new URL(p.url).hostname === new URL(tab.url).hostname
      );
      
      if (passwords.length > 0) {
        chrome.action.setBadgeText({ text: passwords.length.toString(), tabId });
        chrome.action.setBadgeBackgroundColor({ color: '#3b82f6', tabId });
      } else {
        chrome.action.setBadgeText({ text: '', tabId });
      }
    }
  }
});

// Handle extension icon click (when popup is prevented)
chrome.action.onClicked.addListener((tab) => {
  // This only fires if there's no popup set
  console.log('Extension icon clicked');
});

// Listen for commands (keyboard shortcuts)
chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  switch (command) {
    case 'fill-password':
      if (isUnlocked) {
        // Get passwords for current site
        const passwords = passwordCache.filter(p => 
          new URL(p.url).hostname === new URL(tab.url).hostname
        );
        
        if (passwords.length === 1) {
          // Auto-fill if only one password
          await fillPassword(passwords[0].id, tab.id);
        } else if (passwords.length > 1) {
          // Open popup to select
          chrome.action.openPopup();
        }
      } else {
        // Open popup to unlock
        chrome.action.openPopup();
      }
      break;
      
    case 'generate-password':
      const password = generateSecurePassword();
      await chrome.tabs.sendMessage(tab.id, {
        type: 'INSERT_TEXT',
        text: password
      });
      break;
  }
});

// Restore state on startup
chrome.runtime.onStartup.addListener(async () => {
  // Check if we have a valid session
  const session = await chrome.storage.session.get([
    STORAGE_KEYS.AUTH_TOKEN,
    STORAGE_KEYS.VAULT_KEY
  ]);
  
  if (session[STORAGE_KEYS.AUTH_TOKEN] && session[STORAGE_KEYS.VAULT_KEY]) {
    // Verify token is still valid
    authToken = session[STORAGE_KEYS.AUTH_TOKEN];
    const isValid = await checkConnection();
    
    if (isValid.connected) {
      isUnlocked = true;
      vaultKey = session[STORAGE_KEYS.VAULT_KEY];
      setLockTimeout();
    } else {
      // Token expired, clear session
      lockVault();
    }
  }
});