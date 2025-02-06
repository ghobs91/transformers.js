const browserAPI = typeof browser !== "undefined" ? browser : chrome;

browserAPI.runtime.onMessage.addListener((message) => {
    if (message.action === 'analyze_page') {
        if (typeof analyzeLinks !== 'undefined') {
            analyzeLinks();
        } else {
            console.error("analyzeLinks is not defined in content.js");
        }
    }
});

const websiteDomSelectorDict = {
    'youtube.com': {'textTarget': '#video-title', 'ancestorTarget': 'ytd-rich-item-renderer'},
};

const analyzeLinks = async () => {
    if (typeof document === 'undefined') return; // Ensure this only runs in a content script
    
    // Run immediately if the DOM is already loaded
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        processLinks();
    } else {
        document.addEventListener('DOMContentLoaded', processLinks);
    }
};

const waitForElements = (selector, callback) => {
    const observer = new MutationObserver((mutations, observer) => {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
            callback(elements);
            observer.disconnect();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

const processLinks = async () => {
    const cleanHostname = window.location.hostname.replace('www.', '');
    const domSelectorForURL = websiteDomSelectorDict[cleanHostname]['textTarget'];
    const domSelectorForAncestor = websiteDomSelectorDict[cleanHostname]['ancestorTarget'];
    console.log(`Processing links for ${cleanHostname}, the domselectorForUrl is ${domSelectorForURL} and the domSelectorForAncestor is ${domSelectorForAncestor}`);
    const targetElements = waitForElements(domSelectorForURL, (elements) => {
        return elements;
    });
    console.log(`Found ${targetElements.length} target elements`);

    for (let targetElement of targetElements) {
        console.log(`targetElement.innerText: ${targetElement.innerText}`);
        // if (!targetElement.innerText.trim()) continue;

        const message = {
            action: 'classify',
            text: targetElement.innerText,
        };

        browserAPI.runtime.sendMessage(message, (response) => {
            if (response && response.length > 0) {
                const classification = response[0];

                if (classification.label === 'NEGATIVE' && classification.score > 0.7) {
                    console.log(`Bad vibes detected in "${targetElement.innerText}"`);
                    const wrapper = document.createElement('div');
                    wrapper.innerText = 'Bad vibes blocked';
                    wrapper.style.backgroundColor = 'rgba(255, 0, 0, 0.5)';
                    wrapper.style.color = 'white';
                    wrapper.style.padding = '10px';
                    wrapper.style.borderRadius = '5px';
                    wrapper.style.display = 'inline-block';
                    wrapper.style.cursor = 'pointer';
                    wrapper.style.zIndex = '1000';

                    targetElement.style.display = 'none'; // Hide the targetElement
                    targetElement.parentNode.insertBefore(wrapper, targetElement); // Insert the wrapper in place of the link
                    // targetElement.closest(domSelectorForAncestor).style.display = 'none';
                }
            }
        });
    }
};

// Run sentiment analysis when the content script is injected
analyzeLinks();