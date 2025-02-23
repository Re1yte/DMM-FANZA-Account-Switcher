// Load saved accounts
let accounts = [];
let deleteMode = false;
let currentContextMenu = null; // Track the current context menu

// Load accounts from chrome.storage.sync
async function loadAccounts() {
  const result = await chrome.storage.sync.get('fanzaAccounts');
  accounts = result.fanzaAccounts || [];
  // Initialize displayMode for existing accounts
  accounts.forEach(account => {
    if (account.displayMode === undefined) {
      account.displayMode = account.note ? 'note' : 'email';
    }
  });
  displayAccounts();
}

// Save accounts to chrome.storage.sync
async function saveAccounts() {
  await chrome.storage.sync.set({ fanzaAccounts: accounts });
}

// Display accounts
function displayAccounts() {
  const accountsList = document.getElementById('accounts-list');
  accountsList.innerHTML = '';
  
  accounts.forEach((account, index) => {
    const accountDiv = document.createElement('div');
    accountDiv.className = 'account';
    // In displayAccounts(), update the template to use displayMode
    accountDiv.innerHTML = `
    <strong>${account.displayMode === 'note' && account.note ? account.note : account.email}</strong>
    <button data-index="${index}" class="${deleteMode ? 'delete-mode-btn' : 'switch-btn'}"></button>
    `;
    
    // Right-click handler
    accountDiv.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showContextMenu(e, index, account.showNote);
    });

    accountsList.appendChild(accountDiv);
  });

  document.querySelectorAll('.switch-btn, .delete-mode-btn').forEach(button => {
    button.addEventListener('click', () => {
      const index = button.dataset.index;
      if (deleteMode) {
        if (confirm("Are you sure you want to delete this account?")) {
          accounts.splice(index, 1);
          saveAccounts(); // Save updated accounts
          displayAccounts();
        }
      } else {
        switchAccount(index);
      }
    });
  });
}

// Show custom context menu
function showContextMenu(e, index) {
  // Remove any existing context menu
  if (currentContextMenu) {
    currentContextMenu.remove();
    currentContextMenu = null;
  }

  const contextMenu = document.createElement('div');
  contextMenu.className = 'context-menu';
  contextMenu.style.position = 'fixed'; // Use fixed positioning relative to viewport

  // Create menu items
  const renameOption = createMenuItem('Rename', () => {
    const newNote = prompt('Enter a new note:', accounts[index].note || '');
    if (newNote !== null) {
      accounts[index].note = newNote;
      saveAccounts(); // Save updated accounts
      displayAccounts();
    }
    contextMenu.remove();
    currentContextMenu = null;
  });

  const clearNoteOption = createMenuItem('Clear Note', () => {
  accounts[index].note = '';
  accounts[index].displayMode = 'email'; // Reset display to email
  saveAccounts();
  displayAccounts();
  contextMenu.remove();
  currentContextMenu = null;
});

  const account = accounts[index];
  // Add toggle option based on current displayMode
  const toggleText = account.displayMode === 'note' ? 'Show Account' : 'Show Note';
  const toggleOption = createMenuItem(toggleText, () => {
    account.displayMode = account.displayMode === 'note' ? 'email' : 'note';
    saveAccounts();
    displayAccounts();
    contextMenu.remove();
    currentContextMenu = null;
  });

  contextMenu.appendChild(toggleOption);
  contextMenu.appendChild(renameOption);
  contextMenu.appendChild(clearNoteOption);

  document.body.appendChild(contextMenu);

  // Calculate position to avoid clipping
  const menuWidth = contextMenu.offsetWidth;
  const menuHeight = contextMenu.offsetHeight;
  let left = e.clientX;
  let top = e.clientY;

  // Adjust for right/bottom edges of the popup window
  if (left + menuWidth > window.innerWidth) left = window.innerWidth - menuWidth;
  if (top + menuHeight > window.innerHeight) top = window.innerHeight - menuHeight;

  contextMenu.style.left = `${left}px`;
  contextMenu.style.top = `${top}px`;

  currentContextMenu = contextMenu;

  // Close the menu on outside click
  document.addEventListener('click', () => {
    if (currentContextMenu) {
      currentContextMenu.remove();
      currentContextMenu = null;
    }
  }, { once: true });
}

// Helper to create menu items
function createMenuItem(text, onClick) {
  const item = document.createElement('div');
  item.className = 'context-menu-item';
  item.textContent = text;
  item.addEventListener('click', onClick);
  return item;
}

// Toggle delete mode
document.getElementById('remove-account').addEventListener('click', () => {
  deleteMode = !deleteMode;
  document.getElementById('remove-account').style.backgroundColor = deleteMode ? '#ff4444' : '';
  displayAccounts();
});

// Add a new account
document.getElementById('add-account').addEventListener('click', () => {
  const email = prompt('Enter your email:');
  if (email === null) return;

  const password = prompt('Enter your password:');
  if (password === null) return;

  const note = prompt('Add a note (optional):');
  
  if (email && password) {
    accounts.push({ 
      email, 
      password, 
      note, 
      displayMode: note ? 'note' : 'email' // Initialize displayMode
    });
    saveAccounts();
    displayAccounts();
  }
});

// Switch to a specific account
function switchAccount(index) {
  const account = accounts[index];
  if (account) {
    chrome.runtime.sendMessage({ action: 'switchAccount', account }, (response) => {
      if (response && response.success === false) {
        alert('Login failed. Please check your email and password.');
      }
    });
  }
}

// Initial load
loadAccounts();