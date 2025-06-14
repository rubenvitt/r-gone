// Content Script for If I'm Gone Browser Extension

// Constants
const SELECTORS = {
  PASSWORD_INPUTS: 'input[type="password"]',
  USERNAME_INPUTS: 'input[type="text"], input[type="email"], input[name*="user"], input[name*="email"], input[id*="user"], input[id*="email"], input[autocomplete="username"], input[autocomplete="email"]',
  SUBMIT_BUTTONS: 'button[type="submit"], input[type="submit"], button:contains("Log in"), button:contains("Sign in")',
  FORMS: 'form'
};

// State
let detectedForms = [];
let isAutoFillActive = false;

// Initialize content script
function init() {
  console.log('If I\'m Gone content script loaded');
  
  // Detect password fields
  detectPasswordFields();
  
  // Set up observers
  setupObservers();
  
  // Listen for messages
  setupMessageListeners();
  
  // Monitor form submissions
  monitorFormSubmissions();
}

// Detect password fields on the page
function detectPasswordFields() {
  const passwordInputs = document.querySelectorAll(SELECTORS.PASSWORD_INPUTS);
  
  passwordInputs.forEach(input => {
    const form = input.closest('form');
    const formId = form ? getFormId(form) : 'no-form';
    
    if (!detectedForms.find(f => f.id === formId)) {
      const usernameInput = findUsernameInput(input);
      
      detectedForms.push({
        id: formId,
        form: form,
        passwordInput: input,
        usernameInput: usernameInput,
        url: window.location.href
      });
      
      // Add visual indicators
      addVisualIndicators(input);
    }
  });
  
  // Notify background script
  if (passwordInputs.length > 0) {
    chrome.runtime.sendMessage({
      type: 'PASSWORD_FIELDS_DETECTED',
      count: passwordInputs.length
    });
  }
}

// Find username input associated with password field
function findUsernameInput(passwordInput) {
  const form = passwordInput.closest('form');
  
  if (form) {
    // Look for username inputs in the same form
    const inputs = form.querySelectorAll(SELECTORS.USERNAME_INPUTS);
    
    // Find the closest input before the password field
    let closestInput = null;
    let closestDistance = Infinity;
    
    inputs.forEach(input => {
      if (input !== passwordInput) {
        const distance = Math.abs(
          Array.from(form.elements).indexOf(input) - 
          Array.from(form.elements).indexOf(passwordInput)
        );
        
        if (distance < closestDistance) {
          closestDistance = distance;
          closestInput = input;
        }
      }
    });
    
    return closestInput;
  }
  
  // If no form, look for nearby inputs
  const allInputs = document.querySelectorAll(SELECTORS.USERNAME_INPUTS);
  let closestInput = null;
  let closestDistance = Infinity;
  
  allInputs.forEach(input => {
    const rect1 = passwordInput.getBoundingClientRect();
    const rect2 = input.getBoundingClientRect();
    
    const distance = Math.sqrt(
      Math.pow(rect1.x - rect2.x, 2) + 
      Math.pow(rect1.y - rect2.y, 2)
    );
    
    if (distance < closestDistance && rect2.y <= rect1.y) {
      closestDistance = distance;
      closestInput = input;
    }
  });
  
  return closestInput;
}

// Add visual indicators to password fields
function addVisualIndicators(input) {
  // Create indicator element
  const indicator = document.createElement('div');
  indicator.className = 'ifimgone-indicator';
  indicator.innerHTML = `
    <img src="${chrome.runtime.getURL('assets/icons/icon-16.png')}" alt="If I'm Gone" />
  `;
  
  // Style the indicator
  indicator.style.cssText = `
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    cursor: pointer;
    z-index: 10000;
    opacity: 0.7;
    transition: opacity 0.2s;
  `;
  
  indicator.addEventListener('mouseenter', () => {
    indicator.style.opacity = '1';
  });
  
  indicator.addEventListener('mouseleave', () => {
    indicator.style.opacity = '0.7';
  });
  
  // Make input position relative if needed
  const position = window.getComputedStyle(input).position;
  if (position === 'static') {
    input.style.position = 'relative';
  }
  
  // Create wrapper if input is not in a relative container
  const parent = input.parentElement;
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position: relative; display: inline-block; width: 100%;';
  
  parent.insertBefore(wrapper, input);
  wrapper.appendChild(input);
  wrapper.appendChild(indicator);
  
  // Add click handler
  indicator.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    showPasswordMenu(input);
  });
}

// Show password menu
function showPasswordMenu(passwordInput) {
  // Remove existing menu
  const existingMenu = document.querySelector('.ifimgone-menu');
  if (existingMenu) {
    existingMenu.remove();
  }
  
  // Create menu
  const menu = document.createElement('div');
  menu.className = 'ifimgone-menu';
  menu.innerHTML = `
    <div class="ifimgone-menu-header">
      <img src="${chrome.runtime.getURL('assets/icons/icon-16.png')}" alt="If I'm Gone" />
      <span>If I'm Gone</span>
    </div>
    <div class="ifimgone-menu-items">
      <button class="ifimgone-menu-item" data-action="fill">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
        Fill Password
      </button>
      <button class="ifimgone-menu-item" data-action="generate">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M12 2v20m10-10H2"></path>
        </svg>
        Generate Password
      </button>
      <button class="ifimgone-menu-item" data-action="save">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"></path>
          <polyline points="17 21 17 13 7 13 7 21"></polyline>
        </svg>
        Save Password
      </button>
    </div>
  `;
  
  // Style the menu
  menu.style.cssText = `
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 4px;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    z-index: 10001;
    min-width: 200px;
  `;
  
  // Position menu
  const wrapper = passwordInput.parentElement;
  wrapper.appendChild(menu);
  
  // Add menu item handlers
  menu.querySelectorAll('[data-action]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const action = item.dataset.action;
      
      switch (action) {
        case 'fill':
          requestPasswordFill(passwordInput);
          break;
        case 'generate':
          generateAndFillPassword(passwordInput);
          break;
        case 'save':
          saveCurrentPassword(passwordInput);
          break;
      }
      
      menu.remove();
    });
  });
  
  // Close menu on outside click
  setTimeout(() => {
    document.addEventListener('click', function closeMenu(e) {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    });
  }, 0);
}

// Request password fill from extension
async function requestPasswordFill(passwordInput) {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'REQUEST_PASSWORD_FILL',
      url: window.location.href
    });
    
    if (response.passwords && response.passwords.length > 0) {
      if (response.passwords.length === 1) {
        // Auto-fill single password
        fillCredentials(passwordInput, response.passwords[0]);
      } else {
        // Show selection menu
        showPasswordSelection(passwordInput, response.passwords);
      }
    } else {
      showNotification('No passwords found for this site');
    }
  } catch (error) {
    console.error('Failed to request passwords:', error);
  }
}

// Fill credentials into form
function fillCredentials(passwordInput, credentials) {
  // Find associated form data
  const formData = detectedForms.find(f => f.passwordInput === passwordInput);
  
  if (formData) {
    // Fill username
    if (formData.usernameInput && credentials.username) {
      fillInput(formData.usernameInput, credentials.username);
    }
    
    // Fill password
    if (credentials.password) {
      fillInput(passwordInput, credentials.password);
    }
    
    // Highlight filled fields
    highlightFilledFields([formData.usernameInput, passwordInput]);
  }
}

// Fill input with value and trigger events
function fillInput(input, value) {
  input.focus();
  input.value = value;
  
  // Trigger various events to ensure compatibility
  const events = ['input', 'change', 'keyup', 'keydown'];
  events.forEach(eventType => {
    const event = new Event(eventType, { bubbles: true, cancelable: true });
    input.dispatchEvent(event);
  });
  
  // For React and other frameworks
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  ).set;
  nativeInputValueSetter.call(input, value);
  
  const reactEvent = new Event('input', { bubbles: true });
  input.dispatchEvent(reactEvent);
}

// Highlight filled fields
function highlightFilledFields(inputs) {
  inputs.forEach(input => {
    if (input) {
      input.style.transition = 'background-color 0.3s';
      input.style.backgroundColor = '#dbeafe';
      
      setTimeout(() => {
        input.style.backgroundColor = '';
      }, 2000);
    }
  });
}

// Monitor form submissions
function monitorFormSubmissions() {
  document.addEventListener('submit', async (e) => {
    const form = e.target;
    const formData = detectedForms.find(f => f.form === form);
    
    if (formData && formData.passwordInput.value && formData.usernameInput?.value) {
      // Capture credentials
      const credentials = {
        username: formData.usernameInput.value,
        password: formData.passwordInput.value,
        url: window.location.href
      };
      
      // Send to background script
      chrome.runtime.sendMessage({
        type: 'CAPTURE_PASSWORD',
        data: credentials
      });
    }
  });
}

// Setup observers for dynamic content
function setupObservers() {
  // Observe DOM changes
  const observer = new MutationObserver((mutations) => {
    let shouldRedetect = false;
    
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1 && (
          node.matches?.(SELECTORS.PASSWORD_INPUTS) ||
          node.querySelector?.(SELECTORS.PASSWORD_INPUTS)
        )) {
          shouldRedetect = true;
        }
      });
    });
    
    if (shouldRedetect) {
      detectPasswordFields();
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Setup message listeners
function setupMessageListeners() {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.type) {
      case 'CHECK_PASSWORD_FIELDS':
        sendResponse({ hasFields: detectedForms.length > 0 });
        break;
        
      case 'FILL_CREDENTIALS':
        const firstForm = detectedForms[0];
        if (firstForm) {
          fillCredentials(firstForm.passwordInput, request.data);
        }
        sendResponse({ success: true });
        break;
        
      case 'INSERT_TEXT':
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
          fillInput(activeElement, request.text);
        }
        sendResponse({ success: true });
        break;
    }
  });
}

// Generate and fill password
async function generateAndFillPassword(passwordInput) {
  const password = generatePassword();
  fillInput(passwordInput, password);
  
  // Copy to clipboard
  navigator.clipboard.writeText(password);
  showNotification('Password generated and copied to clipboard');
}

// Generate secure password
function generatePassword(length = 16) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  
  return password;
}

// Save current password
async function saveCurrentPassword(passwordInput) {
  const formData = detectedForms.find(f => f.passwordInput === passwordInput);
  
  if (formData && passwordInput.value) {
    const data = {
      url: window.location.href,
      username: formData.usernameInput?.value || '',
      password: passwordInput.value,
      name: document.title || window.location.hostname
    };
    
    chrome.runtime.sendMessage({
      type: 'SAVE_PASSWORD',
      passwordData: data
    });
  }
}

// Show notification
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = 'ifimgone-notification';
  notification.textContent = message;
  
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'error' ? '#ef4444' : '#3b82f6'};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    z-index: 10002;
    animation: slideIn 0.3s ease-out;
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Get unique form ID
function getFormId(form) {
  return form.id || form.name || Array.from(document.forms).indexOf(form).toString();
}

// Add styles
const style = document.createElement('style');
style.textContent = `
  .ifimgone-menu-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    border-bottom: 1px solid #e5e7eb;
    font-weight: 600;
    color: #374151;
  }
  
  .ifimgone-menu-items {
    padding: 4px;
  }
  
  .ifimgone-menu-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 12px;
    border: none;
    background: none;
    color: #374151;
    font-size: 14px;
    text-align: left;
    cursor: pointer;
    border-radius: 4px;
    transition: background-color 0.15s;
  }
  
  .ifimgone-menu-item:hover {
    background-color: #f3f4f6;
  }
  
  .ifimgone-menu-item svg {
    flex-shrink: 0;
    stroke-width: 2;
  }
  
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  @keyframes slideOut {
    from {
      opacity: 1;
      transform: translateX(0);
    }
    to {
      opacity: 0;
      transform: translateX(20px);
    }
  }
`;
document.head.appendChild(style);

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}