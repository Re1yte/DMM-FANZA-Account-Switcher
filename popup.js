// Load saved accounts
// popup.js
let accounts = JSON.parse(localStorage.getItem('fanzaAccounts')) || [];
let deleteMode = false;

function displayAccounts() {
  const accountsList = document.getElementById('accounts-list');
  accountsList.innerHTML = '';
  
  accounts.forEach((account, index) => {
    const accountDiv = document.createElement('div');
    accountDiv.className = 'account';
    accountDiv.innerHTML = `
      <strong>${account.note || account.email}</strong>
      <button data-index="${index}" class="${deleteMode ? 'delete-mode-btn' : 'switch-btn'}"></button>
    `;
    
    // Right-click handler (kept but without delete functionality)
    accountDiv.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      alert('Right-click disabled for this extension');
    });

    accountsList.appendChild(accountDiv);
  });

  document.querySelectorAll('.switch-btn, .delete-mode-btn').forEach(button => {
    button.addEventListener('click', () => {
      const index = button.dataset.index;
      if(deleteMode) {
        if(confirm("Are you sure you want to delete this account?")) {
          accounts.splice(index, 1);
          localStorage.setItem('fanzaAccounts', JSON.stringify(accounts));
          displayAccounts();
        }
      } else {
        switchAccount(index);
      }
    });
  });
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
    accounts.push({ email, password, note });
    localStorage.setItem('fanzaAccounts', JSON.stringify(accounts));
    displayAccounts(); // Refresh the list
  }
});

// Switch to a specific account
function switchAccount(index) {
  const account = accounts[index];
  if (account) {
    chrome.runtime.sendMessage({ action: 'switchAccount', account });
  }
}

// Delete an account
function deleteAccount(index) {
  if (confirm("Are you sure you want to delete this account?")) {
    accounts.splice(index, 1);
    localStorage.setItem('fanzaAccounts', JSON.stringify(accounts));
    displayAccounts(); // Refresh the list
  }
}

// Initial display
displayAccounts();