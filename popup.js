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

function disableChat() {
    document.getElementById('questionInput').disabled = true;
    document.getElementById('askQuestion').disabled = true;
    document.getElementById('inputSection').style.display = 'none';
    document.getElementById('chatSection').style.display = 'none';
    document.getElementById('chatSection').innerHTML = '';
}

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
