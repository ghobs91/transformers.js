chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'analyze_page') {
        if (typeof analyzeLinks !== 'undefined') {
            analyzeLinks();
        } else {
            console.error("analyzeLinks is not defined in content.js");
        }
    }
});

const analyzeLinks = async () => {
    if (typeof document === 'undefined') return; // Ensure this only runs in a content script
    
    // Run immediately if the DOM is already loaded
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        processLinks();
    } else {
        document.addEventListener('DOMContentLoaded', processLinks);
    }
};

const processLinks = async () => {
    const links = document.querySelectorAll('a');

    for (let link of links) {
        if (!link.innerText.trim()) continue;

        const message = {
            action: 'classify',
            text: link.innerText,
        };

        chrome.runtime.sendMessage(message, (response) => {
            if (response && response.length > 0) {
                const classification = response[0];

                if (classification.label === 'NEGATIVE' && classification.score > 0.7) {
                    const overlay = document.createElement('div');
                    overlay.innerText = 'Bad vibes blocked';
                    overlay.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                    overlay.style.color = 'white';
                    overlay.style.padding = '10px';
                    overlay.style.borderRadius = '16px';
                    overlay.style.border = '1px solid rgba(255, 255, 255, 0.3)';
                    overlay.style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.1)';
                    overlay.style.backdropFilter = 'blur(5px)';
                    overlay.style.position = 'absolute';
                    overlay.style.top = '0';
                    overlay.style.left = '0';
                    overlay.style.width = '100%';
                    overlay.style.height = '100%';
                    overlay.style.display = 'flex';
                    overlay.style.alignItems = 'center';
                    overlay.style.justifyContent = 'center';
                    overlay.style.cursor = 'pointer';
                    overlay.style.zIndex = '1000';
                    overlay.addEventListener('click', () => {
                        overlay.style.display = 'none'; // Hide overlay
                    });

                    link.style.position = 'relative'; // Ensure link remains in place
                    link.appendChild(overlay);
                }
            }
        });
    }
};

// Run sentiment analysis when the content script is injected
analyzeLinks();