chrome.commands.onCommand.addListener((command) => {
  if (command === "open-categorize-popup") {
    chrome.action.openPopup(); // Open the extension popup
  }
});
