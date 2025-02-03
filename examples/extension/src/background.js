import { pipeline, env } from '@xenova/transformers';

// Skip initial check for local models, since we are not loading any local models.
env.allowLocalModels = false;

// Due to a bug in onnxruntime-web, we must disable multithreading for now.
env.backends.onnx.wasm.numThreads = 1;

class PipelineSingleton {
    static task = 'text-classification';
    static model = 'Xenova/distilbert-base-uncased-finetuned-sst-2-english';
    static instance = null;

    static async getInstance(progress_callback = null) {
        if (this.instance === null) {
            this.instance = pipeline(this.task, this.model, { progress_callback });
        }
        return this.instance;
    }
}

// Function to classify text and return sentiment results
const classify = async (text) => {
    let model = await PipelineSingleton.getInstance();
    let result = await model(text);
    return result;
};

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'classify') {
        (async function () {
            let result = await classify(message.text);
            sendResponse(result);
        })();
        return true; // Keep the message channel open for async response
    }
});

// Inject content script dynamically when a new tab is updated
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('http')) {
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ["content.js"]
        }).catch(error => console.error("Error injecting content script:", error));
    }
});