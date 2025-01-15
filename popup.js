/**
 * @fileoverview Popup script for the AMA Chrome extension.
 * Handles user interface interactions, crawl process management,
 * and chat functionality. Communicates with the background script
 * for crawling and question-answering operations.
 */

/**
 * Event listener for the crawl start button.
 * Initiates the web crawling process after validating API keys.
 * Disables the button during crawling and shows status updates.
 */
document.getElementById('startCrawl').addEventListener('click', function() {
    document.getElementById('startCrawl').disabled = true;
    document.getElementById('status').innerText = 'Checking API keys...';

    chrome.storage.local.get(['firecrawlKey'], function(result) {
        if (!result.firecrawlKey) {
            document.getElementById('status').innerText = 'Please set your API keys in Settings.';
            document.getElementById('startCrawl').disabled = false;
        } else {
            startCrawlProcess();
        }
    });
});

let fakeProgressInterval;
let fakeProgress = 0;
let fakeProgressCompleted = false;

/**
 * Initiates the web crawling process for the current tab.
 * @description
 * This function:
 * 1. Updates UI to show crawl progress
 * 2. Starts a fake progress bar animation
 * 3. Disables chat functionality during crawl
 * 4. Sends crawl request to background script
 * 5. Handles success/error responses
 * 
 * The function uses chrome.tabs API to get the current URL
 * and chrome.runtime for message passing to the background script.
 */
function startCrawlProcess() {
    document.getElementById('status').innerText = 'Starting crawl...';
    document.getElementById('progressContainer').style.display = 'block';
    document.getElementById('progressBar').style.width = '0%';
    fakeProgress = 0;
    fakeProgressCompleted = false;

    startFakeProgressBar();

    disableChat();

    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        const currentUrl = tabs[0].url;
        chrome.runtime.sendMessage({action: 'startCrawl', url: currentUrl}, function(response) {
            if (response.success) {
                document.getElementById('status').innerText = 'Crawling started...';
                pollCrawlStatus(response.crawlId);
            } else {
                document.getElementById('status').innerText = 'Error starting crawl: ' + response.error;
                document.getElementById('startCrawl').disabled = false;
                document.getElementById('progressContainer').style.display = 'none';
                stopFakeProgressBar();
                enableChat();
            }
        });
    });
}

/**
 * Animates a progress bar to provide visual feedback during crawling.
 * @description
 * Creates a smooth progress animation that goes up to 80%,
 * leaving the remaining 20% for actual crawl progress updates.
 * Uses setInterval for animation timing.
 * 
 * @constant {number} totalDuration - Total animation duration in ms
 * @constant {number} updateInterval - Time between updates in ms
 * @constant {number} targetProgress - Maximum progress percentage
 */
function startFakeProgressBar() {
    const totalDuration = 6000; // 8 seconds
    const updateInterval = 25; // Update every 100ms
    const targetProgress = 80; // Fake progress goes up to 80%
    const increment = targetProgress / (totalDuration / updateInterval);

    fakeProgressInterval = setInterval(() => {
        fakeProgress += increment;
        if (fakeProgress >= targetProgress) {
            fakeProgress = targetProgress;
            clearInterval(fakeProgressInterval);
            fakeProgressCompleted = true;
        }
        updateProgressBar(fakeProgress);
    }, updateInterval);
}

/**
 * Stops the fake progress bar animation.
 * @description
 * Clears the interval timer and marks the fake progress
 * as completed to allow real progress updates to take over.
 */
function stopFakeProgressBar() {
    if (fakeProgressInterval) {
        clearInterval(fakeProgressInterval);
        fakeProgressCompleted = true;
    }
}

/**
 * Updates the width of the progress bar.
 * @param {number} progress - The progress percentage (0-100)
 * @description
 * Updates the visual progress bar width based on the
 * provided percentage value.
 */
function updateProgressBar(progress) {
    document.getElementById('progressBar').style.width = progress + '%';
}

/**
 * Polls the background script for crawl status updates.
 * @param {string} crawlId - The ID of the crawl to check
 * @description
 * Repeatedly checks crawl status and updates UI accordingly:
 * - Updates progress bar and status message
 * - Enables/disables chat functionality
 * - Handles completion and error states
 * - Manages conversation history storage
 */
function pollCrawlStatus(crawlId) {
    chrome.runtime.sendMessage({action: 'checkCrawlStatus', crawlId: crawlId}, function(response) {
        if (response.status === 'completed') {
            document.getElementById('status').innerText = `Crawl completed. ${response.total} pages crawled.`;
            document.getElementById('startCrawl').disabled = false;

            updateProgressBar(100);

            setTimeout(() => {
                document.getElementById('progressContainer').style.display = 'none';
            }, 1000);

            stopFakeProgressBar();

            enableChat();

            chrome.storage.local.set({conversationHistories: {}});
        } else if (response.status === 'scraping') {
            // Update status message
            document.getElementById('status').innerText = `Crawling in progress... (${response.completed}/${response.total} pages)`;

            // Update progress bar after fake progress completes
            if (fakeProgressCompleted) {
                const completed = response.completed || 0;
                const total = response.total || 1; // Avoid division by zero
                let actualProgress = (completed / total) * 20; // Remaining 20%
                let totalProgress = 80 + actualProgress; // Add to the initial 80%
                if (totalProgress > 100) totalProgress = 100; // Cap at 100%
                updateProgressBar(totalProgress);
            }

            setTimeout(function() {
                pollCrawlStatus(crawlId);
            }, 1000);
        } else if (response.status === 'error') {
            document.getElementById('status').innerText = 'Error during crawl: ' + response.error;
            document.getElementById('startCrawl').disabled = false;
            document.getElementById('progressContainer').style.display = 'none';
            stopFakeProgressBar();
            enableChat();
        } else {
            document.getElementById('status').innerText = 'Unexpected crawl status.';
            document.getElementById('startCrawl').disabled = false;
            document.getElementById('progressContainer').style.display = 'none';
            stopFakeProgressBar();
            enableChat();
        }
    });
}


document.getElementById('askQuestion').addEventListener('click', function() {
    sendMessage();
});

document.getElementById('questionInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        sendMessage();
    }
});

/**
 * Sends a user question to the background script and handles the response stream.
 * @description
 * This function:
 * 1. Gets the question from input field
 * 2. Disables input during processing
 * 3. Displays the question in chat
 * 4. Establishes a connection to background script
 * 5. Handles streaming response
 * 6. Updates conversation history
 * 
 * Uses chrome.runtime.connect for long-lived connection
 * to handle streaming responses from OpenAI API.
 */
function sendMessage() {
    const question = document.getElementById('questionInput').value.trim();
    if (question === '') {
        return;
    }

    document.getElementById('questionInput').disabled = true;
    document.getElementById('askQuestion').disabled = true;

    appendMessage('user', question);
    document.getElementById('questionInput').value = '';

    const port = chrome.runtime.connect({name: "openaiStream"});
    port.postMessage({action: 'askQuestionStream', question: question});
    let assistantMessage = '';
    appendMessage('assistant', '...'); 

    port.onMessage.addListener(function(msg) {
        if (msg.answer) {
            assistantMessage += msg.answer;
            updateLastAssistantMessage(assistantMessage);
        } else if (msg.done) {
            document.getElementById('questionInput').disabled = false;
            document.getElementById('askQuestion').disabled = false;
            document.getElementById('questionInput').focus();
            updateConversationHistory(question, assistantMessage);
        } else if (msg.error) {
            updateLastAssistantMessage('Error: ' + msg.error);
            document.getElementById('questionInput').disabled = false;
            document.getElementById('askQuestion').disabled = false;
        }
    });
}

/**
 * Appends a new message to the chat interface.
 * @param {string} sender - The sender of the message ('user' or 'assistant')
 * @param {string} text - The message content
 * @description
 * Creates and appends a new message element to the chat section,
 * applying appropriate styling based on sender type.
 * Handles markdown parsing and auto-scrolling.
 */
function appendMessage(sender, text) {
    const chatSection = document.getElementById('chatSection');
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender);

    const bubbleDiv = document.createElement('div');
    bubbleDiv.classList.add('bubble');

    bubbleDiv.innerHTML = parseMarkdown(text);

    messageDiv.appendChild(bubbleDiv);
    chatSection.appendChild(messageDiv);
    chatSection.scrollTop = chatSection.scrollHeight;
}

/**
 * Updates the content of the last assistant message in the chat.
 * @param {string} text - The new message content
 * @description
 * Finds the last assistant message bubble and updates its content,
 * parsing markdown and maintaining scroll position.
 * Used for streaming updates from the assistant.
 */
function updateLastAssistantMessage(text) {
    const chatSection = document.getElementById('chatSection');
    const messages = chatSection.getElementsByClassName('message assistant');
    if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        const bubbleDiv = lastMessage.querySelector('.bubble');

        bubbleDiv.innerHTML = parseMarkdown(text);
        chatSection.scrollTop = chatSection.scrollHeight;
    }
}

/**
 * Converts markdown text to HTML with safety measures.
 * @param {string} text - The markdown text to parse
 * @returns {string} HTML string with markdown converted and special characters escaped
 * @description
 * Handles:
 * - HTML character escaping for security
 * - Bold text (**text**)
 * - Bullet points
 * - Line breaks
 * - Links with safe attributes
 */
function parseMarkdown(text) {
    let escapedText = text.replace(/[&<>"']/g, function(match) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[match];
    });

    escapedText = escapedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    escapedText = escapedText.replace(/^(\s*)[-*]\s+(.*)$/gm, '$1&nbsp;&bull;&nbsp;$2');

    escapedText = escapedText.replace(/\n/g, '<br>');

    escapedText = escapedText.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, function(match, p1, p2) {
        return `<a href="${p2}" target="_blank" rel="noopener noreferrer">${p1}</a>`;
    });

    return escapedText;
}

/**
 * Updates the conversation history in Chrome storage.
 * @param {string} question - The user's question
 * @param {string} answer - The assistant's answer
 * @description
 * Stores conversations per domain in Chrome local storage,
 * maintaining separate history for different websites.
 * Used to provide context for future questions.
 */
function updateConversationHistory(question, answer) {
    chrome.storage.local.get(['conversationHistories', 'currentDomain'], function(result) {
        const domain = result.currentDomain;
        let conversationHistories = result.conversationHistories || {};
        let conversationHistory = conversationHistories[domain] || [];
        conversationHistory.push({role: 'user', content: question});
        conversationHistory.push({role: 'assistant', content: answer});
        conversationHistories[domain] = conversationHistory;
        chrome.storage.local.set({conversationHistories: conversationHistories});
    });
}

/**
 * Disables chat functionality in the UI.
 * @description
 * - Disables input field and send button
 * - Hides chat interface elements
 * - Clears existing chat messages
 * Used during crawling process.
 */
function disableChat() {
    document.getElementById('questionInput').disabled = true;
    document.getElementById('askQuestion').disabled = true;
    document.getElementById('inputSection').style.display = 'none';
    document.getElementById('chatSection').style.display = 'none';
    document.getElementById('chatSection').innerHTML = '';
}

/**
 * Enables chat functionality in the UI.
 * @description
 * - Enables input field and send button
 * - Shows chat interface elements
 * Used after crawling is complete.
 */
function enableChat() {
    document.getElementById('questionInput').disabled = false;
    document.getElementById('askQuestion').disabled = false;
    document.getElementById('inputSection').style.display = 'flex';
    document.getElementById('chatSection').style.display = 'block';
}

document.getElementById('openOptions').addEventListener('click', function() {
    chrome.runtime.openOptionsPage();
});

document.addEventListener('DOMContentLoaded', function() {
    chrome.storage.local.get(['conversationHistories', 'currentDomain', 'crawlInProgress'], function(result) {
        const domain = result.currentDomain;
        const conversationHistories = result.conversationHistories || {};
        const conversationHistory = conversationHistories[domain] || [];

        if (result.crawlInProgress) {
            disableChat();
            document.getElementById('status').innerText = 'Crawling in progress...';
            document.getElementById('progressContainer').style.display = 'block';
        } else {
            if (conversationHistory.length > 0) {
                enableChat();
                for (const message of conversationHistory) {
                    appendMessage(message.role, message.content);
                }
            }
        }
    });
});
