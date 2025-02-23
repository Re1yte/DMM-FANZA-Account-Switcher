let extensionTabs = [];
let originalTabId = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'switchAccount') {
    // Get current active tab before switching
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]) {
        originalTabId = tabs[0].id;
        const { email, password } = request.account;
        switchFanzaAccount(email, password, sendResponse);
      }
    });
    return true; // Keep the message channel open for async response
  }
});

async function switchFanzaAccount(email, password, sendResponse) {
  console.log("Starting account switch...");

  // Step 1: Log out (open in background)
  console.log("Logging out...");
  const logoutTab = await chrome.tabs.create({ 
    url: 'https://accounts.dmm.co.jp/service/logout/=/path=https%3A%2F%2Fwww.dmm.co.jp%2Ftop%2F',
    active: false // Don't switch to this tab
  });
  extensionTabs.push(logoutTab.id);

  // Add a delay of 1.5 seconds before proceeding to the next step
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Step 2: Open login page in background
  console.log("Opening login page...");
  const loginTab = await chrome.tabs.create({
    url: 'https://accounts.dmm.co.jp/service/login/password',
    active: false // Don't switch to this tab
  });
  extensionTabs.push(loginTab.id);

  // Wait for the login page to load
  console.log("Waiting for login page to load...");
  await new Promise(resolve => {
    chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
      if (tabId === loginTab.id && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    });
  });

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

  // Step 6: Return to the original tab
  if (originalTabId) {
    console.log("Returning to original tab...");
    chrome.tabs.update(originalTabId, { active: true });
  }

  // Step 7: Reload the game page if needed
  console.log("Reloading game page...");
  const gameTabs = await chrome.tabs.query({ 
    url: [
      'https://games.dmm.co.jp/*',
      'https://pc-play.games.dmm.co.jp/*'
    ]
  });
  if (gameTabs.length > 0) {
    gameTabs.forEach(tab => {
      chrome.tabs.reload(tab.id);
    });
  }

  // Send response indicating success
  sendResponse({ success: true });
}