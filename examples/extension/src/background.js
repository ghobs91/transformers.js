const browserAPI = typeof browser !== "undefined" ? browser : chrome;

const supportedWebsites = [
    "bbc.com", "cnn.com", "nytimes.com", "theguardian.com",
    "reddit.com", "youtube.com", "bsky.app", "theverge.com"
];

browserAPI.runtime.onInstalled.addListener(() => {
    console.log("Background service worker loaded");
});

// Forward classification requests to content script
browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Received message:", message);
    
    if (message.action === "classify") {
        console.log("Forwarding classification request to content script");
        browserAPI.tabs.sendMessage(sender.tab.id, { action: "classify", text: message.text }, sendResponse);
        return true; // Keep the response channel open
    }
});

// Inject content script dynamically when a supported website is visited
browserAPI.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.url) {
        if (supportedWebsites.some(website => tab.url.includes(website))) {
            console.log(`Injecting content script into: ${tab.url}`);
            browserAPI.scripting.executeScript({
                target: { tabId: tabId },
                files: ["content.js"]
            }).catch(error => console.error("Error injecting content script:", error));
        }
    }
});
