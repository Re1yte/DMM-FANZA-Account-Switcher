let extensionTabs = [];
let originalTabId = null; // Track original tab

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'switchAccount') {
    originalTabId = sender.tab.id; // Store current tab ID
    const { email, password } = request.account;
    switchFanzaAccount(email, password);
  }
});

async function switchFanzaAccount(email, password) {
  // Step 1: Log out (open in background)
  const logoutTab = await chrome.tabs.create({ 
    url: 'https://accounts.dmm.co.jp/service/logout/=/path=https%3A%2F%2Fwww.dmm.co.jp%2Ftop%2F',
    active: false // Don't switch to this tab
  });
  extensionTabs.push(logoutTab.id);

  // Wait for logout completion
  await new Promise(resolve => {
    chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
      if (tabId === logoutTab.id && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    });
  });

  // Step 2: Open login page in background
  const loginTab = await chrome.tabs.create({
    url: 'https://accounts.dmm.co.jp/service/login/password',
    active: false // Don't switch to this tab
  });
  extensionTabs.push(loginTab.id);

  // Step 3: Fill and submit the login form
  console.log("Filling login form...");
  const result = await chrome.scripting.executeScript({
    target: { tabId: loginTab.id },
    func: (email, password) => {
      try {
        const emailField = document.querySelector('input[name="login_id"]');
        const passwordField = document.querySelector('input[name="password"]');
        const submitButton = document.querySelector('button[type="submit"]');

        if (emailField && passwordField && submitButton) {
          // Clear fields and fill them
          emailField.value = '';
          passwordField.value = '';
          emailField.value = email;
          passwordField.value = password;

          // Trigger input events to ensure the website recognizes the changes
          emailField.dispatchEvent(new Event('input', { bubbles: true }));
          passwordField.dispatchEvent(new Event('input', { bubbles: true }));

          // Submit the form
          submitButton.click();
          return "Login submitted!";
        } else {
          return "Error: Form elements not found!";
        }
      } catch (error) {
        return `Error: ${error.message}`;
      }
    },
    args: [email, password],
  });

  console.log(result[0].result);

  // Step 4: Wait for the redirect to https://www.dmm.co.jp/top/
  console.log("Waiting for redirect to https://www.dmm.co.jp/top/...");
  await new Promise(resolve => {
    chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
      if (tabId === loginTab.id && info.url === 'https://www.dmm.co.jp/top/') {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    });
  });

  // Step 5: Close all tabs opened by the extension
  console.log("Closing extension tabs...");
  for (const tabId of extensionTabs) {
    chrome.tabs.remove(tabId);
  }
  extensionTabs = []; // Reset the list

 // Return to original tab if it still exists
  if (originalTabId) {
    chrome.tabs.get(originalTabId, (tab) => {
      if (!chrome.runtime.lastError && tab) {
        chrome.tabs.update(originalTabId, { active: true });
      }
    });
  }

  // Reload game page if needed
  const gameTabs = await chrome.tabs.query({ 
    url: [
      'https://games.dmm.co.jp/detail/lilyange*',
      'https://pc-play.games.dmm.co.jp/play/lilyange/*'
    ] 
  });
  
  if (gameTabs.length > 0) {
    gameTabs.forEach(tab => {
      chrome.tabs.reload(tab.id);
    });
  }
}