/**
 * popup.js - User Interface Controller for Ask Me Anything AI Chrome Extension
 * 
 * This script manages the extension's popup interface, including:
 * - Crawl initiation and progress tracking
 * - Chat interface for Q&A
 * - Message handling with background script
 * - UI state management and updates
 */

/**
 * Initializes click handler for the crawl start button
 * Checks for API key configuration before starting the crawl
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
 * Initiates the web crawling process and manages UI state
 * 
 * This function:
 * - Updates UI to show crawl progress
 * - Disables chat functionality during crawl
 * - Communicates with background script to start crawl
 * - Initializes progress tracking
 * 
 * Side effects:
 * - Updates status message
 * - Shows progress bar
 * - Disables/enables UI elements
 * - Starts fake progress animation
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
 * Creates an animated progress bar for visual feedback during crawl
 * 
 * @private
 * The progress bar:
 * - Animates from 0% to 80% over 6 seconds
 * - Remaining 20% is filled by actual crawl progress
 * - Updates every 25ms for smooth animation
 * 
 * Side effects:
 * - Updates progressBar width
 * - Sets global fakeProgress and fakeProgressInterval
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

function stopFakeProgressBar() {
    if (fakeProgressInterval) {
        clearInterval(fakeProgressInterval);
        fakeProgressCompleted = true;
    }
}

function updateProgressBar(progress) {
    document.getElementById('progressBar').style.width = progress + '%';
}

/**
 * Polls the background script for crawl status updates
 * @param {string} crawlId - The ID of the crawl to check
 * 
 * Status handling:
 * - 'completed': Updates UI, enables chat, clears conversation history
 * - 'scraping': Updates progress bar and status message
 * - 'error': Shows error message, resets UI state
 * 
 * Side effects:
 * - Updates status message and progress bar
 * - Enables/disables chat interface
 * - Manages chrome.storage for conversation history
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
 * Sends a user question to the background script and handles the response stream
 * 
 * The function:
 * - Gets question from input field
 * - Disables input during processing
 * - Establishes connection to background script
 * - Handles streaming response
 * - Updates chat interface with responses
 * 
 * Side effects:
 * - Disables/enables input elements
 * - Updates chat display
 * - Manages connection port
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
 * Adds a new message to the chat display
 * @param {string} sender - The message sender ('user' or 'assistant')
 * @param {string} text - The message content to display
 * 
 * Side effects:
 * - Creates new message elements in the DOM
 * - Applies appropriate styling based on sender
 * - Auto-scrolls chat to latest message
 * - Parses markdown in message text
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
 * Converts markdown text to HTML with security measures
 * @param {string} text - The markdown text to parse
 * @returns {string} HTML string with markdown converted and HTML escaped
 * 
 * Supports:
 * - Bold text (**text**)
 * - Bullet points
 * - Links with target="_blank"
 * - Line breaks
 * 
 * Security:
 * - Escapes HTML characters to prevent XSS
 * - Uses noopener/noreferrer for external links
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
 * Updates the conversation history in chrome.storage
 * @param {string} question - The user's question
 * @param {string} answer - The assistant's response
 * 
 * Stores conversations:
 * - Organized by domain
 * - Maintains chronological order
 * - Persists across extension sessions
 * 
 * Side effects:
 * - Updates chrome.storage.local
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
 * Disables the chat interface during crawl operations
 * 
 * Side effects:
 * - Disables input and send button
 * - Hides chat section
 * - Clears existing messages
 */
function disableChat() {
    document.getElementById('questionInput').disabled = true;
    document.getElementById('askQuestion').disabled = true;
    document.getElementById('inputSection').style.display = 'none';
    document.getElementById('chatSection').style.display = 'none';
    document.getElementById('chatSection').innerHTML = '';
}

/**
 * Enables the chat interface after crawl completion
 * 
 * Side effects:
 * - Enables input and send button
 * - Shows chat section
 * - Restores chat functionality
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
