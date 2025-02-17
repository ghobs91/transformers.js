let model;

// Load the ONNX model only once
async function loadModel() {
    if (!model) {
        model = await ort.InferenceSession.create(chrome.runtime.getURL("sentiment_model.onnx"));
    }
}

// Preprocess text (convert characters to normalized input)
function preprocessText(text) {
    return text.split("").map(char => char.charCodeAt(0) / 255); // Normalize ASCII
}

// Interpret ONNX model output
function interpretSentiment(prediction) {
    const categories = ["Negative", "Neutral", "Positive"];
    return categories[prediction.indexOf(Math.max(...prediction))];
}

// Analyze sentiment using ONNX
async function analyzeSentiment(text) {
    await loadModel();
    const inputTensor = new ort.Tensor("float32", preprocessText(text), [1, text.length]);
    const results = await model.run({ input: inputTensor });
    return interpretSentiment(results.sentiment.data);
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.action === "classify") {
        console.log("Classifying:", message.text);
        const result = await analyzeSentiment(message.text);
        sendResponse({ sentiment: result });
    }
    return true; // Keep the response channel open
});

// DOM selectors for different websites
const websiteDomSelectorDict = {
    "youtube.com": { textTarget: "#video-title", ancestorTarget: "ytd-rich-item-renderer" },
    "reddit.com": { textTarget: "faceplate-screen-reader-content", ancestorTarget: "article" },
    "bsky.app": { textTarget: '[data-testid="postText"]', ancestorTarget: '[data-feed-context="friends"]' },
};

// Wait for elements and process them
const waitForElements = (selector, callback) => {
    const observer = new MutationObserver((mutations, observer) => {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
            callback(elements);
            observer.disconnect();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
};

// Analyze page content
const analyzeLinks = async () => {
    if (typeof document === "undefined") return;
    if (document.readyState === "complete" || document.readyState === "interactive") {
        processLinks();
    } else {
        document.addEventListener("DOMContentLoaded", processLinks);
    }
};

// Process extracted links for sentiment analysis
const processLinks = async () => {
    const cleanHostname = window.location.hostname.replace("www.", "");
    const selectors = websiteDomSelectorDict[cleanHostname];
    if (!selectors) return;

    waitForElements(selectors.textTarget, (elements) => {
        elements.forEach(targetElement => {
            const message = { action: "classify", text: targetElement.innerText };

            chrome.runtime.sendMessage(message, (response) => {
                if (response && response.sentiment === "Negative") {
                    console.log(`Bad vibes detected in "${targetElement.innerText}"`);
                    
                    const wrapper = document.createElement("div");
                    wrapper.innerText = "Bad vibes blocked";
                    Object.assign(wrapper.style, {
                        backgroundColor: "rgba(255, 0, 0, 0.5)",
                        color: "white",
                        padding: "10px",
                        borderRadius: "5px",
                        display: "inline-block",
                        cursor: "pointer",
                        zIndex: "1000"
                    });

                    targetElement.style.display = "none"; 
                    targetElement.parentNode.insertBefore(wrapper, targetElement);
                }
            });
        });
    });
};

// Run sentiment analysis when content script loads
analyzeLinks();
