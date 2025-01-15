/**
 * @fileoverview Background script for the AMA Chrome extension.
 * Handles message passing between the popup and content scripts,
 * manages web crawling through Firecrawl API, and processes
 * questions through OpenAI's API.
 */

/**
 * Listens for messages from other parts of the extension.
 * Handles 'startCrawl' and 'checkCrawlStatus' actions.
 * @param {Object} request - The message request object
 * @param {string} request.action - The action to perform ('startCrawl' or 'checkCrawlStatus')
 * @param {string} [request.url] - The URL to crawl (for 'startCrawl' action)
 * @param {string} [request.crawlId] - The crawl ID to check (for 'checkCrawlStatus' action)
 * @param {Object} sender - Details about the message sender
 * @param {function} sendResponse - Callback to send a response
 * @returns {boolean} True to indicate async response handling
 */
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'startCrawl') {
        startCrawl(request.url).then(response => {
            sendResponse(response);
        });
    } else if (request.action === 'checkCrawlStatus') {
        checkCrawlStatus(request.crawlId).then(response => {
            sendResponse(response);
        });
    }
    return true;
});

/**
 * Handles long-lived connections for streaming responses.
 * Currently supports the 'openaiStream' connection for real-time
 * question-answering functionality.
 * @param {Object} port - The connection port object
 */
chrome.runtime.onConnect.addListener(function(port) {
    if (port.name === 'openaiStream') {
        port.onMessage.addListener(function(request) {
            if (request.action === 'askQuestionStream') {
                askQuestionStream(request.question, port);
            }
        });
    }
});

/**
 * Initiates a web crawl for a given URL using the Firecrawl API.
 * @param {string} url - The URL to start crawling from
 * @returns {Promise<Object>} A promise that resolves to:
 *   - success: true/false indicating if crawl started successfully
 *   - crawlId: string (if success is true) - The ID of the crawl
 *   - error: string (if success is false) - Error message
 * @description
 * This function:
 * 1. Retrieves configuration from Chrome storage
 * 2. Validates the Firecrawl API key
 * 3. Initiates crawl with configured parameters
 * 4. Stores crawl ID and initializes conversation history
 */
function startCrawl(url) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['firecrawlKey', 'maxDepth', 'limit', 'timeout', 'allowBackwardLinks', 'waitFor'], function(result) {
            const firecrawlKey = result.firecrawlKey;
            const maxDepth = result.maxDepth || 3;
            const limit = result.limit || 50;
            const timeout = result.timeout || 20000; // Default timeout in milliseconds
            const allowBackwardLinks = typeof result.allowBackwardLinks !== 'undefined' ? result.allowBackwardLinks : true;
            const waitFor = result.waitFor || 2000; // Default wait time in milliseconds

            if (!firecrawlKey) {
                resolve({ success: false, error: 'Firecrawl API key not set. Please set it in the options page.' });
                return;
            }

            const apiUrl = 'https://api.firecrawl.dev/v1/crawl';
            const data = {
                url: url,
                scrapeOptions: {
                    formats: ['markdown'],
                    waitFor: waitFor,       // Use the waitFor setting
                    timeout: timeout        // Use the timeout setting
                },
                limit: limit,
                allowBackwardLinks: allowBackwardLinks, // Use the allowBackwardLinks setting
                maxDepth: maxDepth
            };

            fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + firecrawlKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Store crawl ID and domain
                    const urlObj = new URL(url);
                    const domain = urlObj.hostname;
                    chrome.storage.local.set({ crawlId: data.id, currentDomain: domain }, function() {
                        // Initialize conversation history
                        chrome.storage.local.get(['conversationHistories'], function(res) {
                            let conversationHistories = res.conversationHistories || {};
                            conversationHistories[domain] = [];
                            chrome.storage.local.set({ conversationHistories: conversationHistories }, function() {
                                resolve({ success: true, crawlId: data.id });
                            });
                        });
                    });
                } else {
                    resolve({ success: false, error: 'Failed to start crawl. Please check your API key and URL.' });
                }
            })
            .catch(error => {
                resolve({ success: false, error: error.message });
            });
        });
    });
}


/**
 * Polls the Firecrawl API to check the status of a crawl.
 * @param {string} crawlId - The ID of the crawl to check
 * @returns {Promise<Object>} A promise that resolves to:
 *   - status: string ('completed'|'scraping'|'error')
 *   - total: number (if status is 'completed' or 'scraping')
 *   - completed: number (if status is 'completed' or 'scraping')
 *   - error: string (if status is 'error')
 * @description
 * Retrieves the current status of a crawl operation and stores
 * the crawled data in Chrome storage when completed.
 */
function checkCrawlStatus(crawlId) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['firecrawlKey'], function(result) {
            const firecrawlKey = result.firecrawlKey;
            if (!firecrawlKey) {
                resolve({status: 'error', error: 'Firecrawl API key not set.'});
                return;
            }

            const apiUrl = `https://api.firecrawl.dev/v1/crawl/${crawlId}`;

            fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer ' + firecrawlKey
                }
            }).then(response => response.json())
            .then(data => {
                if (data.status === 'completed') {

                    chrome.storage.local.set({crawlData: data.data}, function() {
                        resolve({status: 'completed', total: data.total, completed: data.completed});
                    });
                } else if (data.status === 'scraping') {
                    resolve({status: 'scraping', total: data.total, completed: data.completed});
                } else {
                    resolve({status: 'error', error: 'Unknown crawl status.'});
                }
            }).catch(error => {
                resolve({status: 'error', error: error.message});
            });
        });
    });
}

/**
 * Streams a question to the OpenAI API and retrieves a reply in increments.
 * @param {string} question - The user's question to be answered
 * @param {Object} port - Chrome runtime port for streaming data back to the popup
 * @description
 * This function:
 * 1. Retrieves OpenAI key and crawl data from Chrome storage
 * 2. Prepares conversation context from crawled content
 * 3. Streams the response from OpenAI's API
 * 4. Updates conversation history in Chrome storage
 * 
 * The function handles streaming by:
 * - Breaking response into chunks
 * - Sending incremental updates through the port
 * - Maintaining conversation history per domain
 * 
 * @example
 * // Usage in message listener:
 * port.onMessage.addListener(function(request) {
 *   if (request.action === 'askQuestionStream') {
 *     askQuestionStream(request.question, port);
 *   }
 * });
 */
function askQuestionStream(question, port) {
    chrome.storage.local.get(['openaiKey', 'crawlData', 'currentDomain', 'conversationHistories', 'maxContentLength', 'model'], function(result) {
        const openaiKey = result.openaiKey;
        const crawlData = result.crawlData;
        const domain = result.currentDomain;
        let conversationHistories = result.conversationHistories || {};
        let conversationHistory = conversationHistories[domain] || [];
        const maxContentLength = result.maxContentLength || 250000; // Default max characters
        const model = result.model || 'gpt-4o-mini'; // Default model

        if (!openaiKey) {
            port.postMessage({ error: 'OpenAI API key not set. Please set it in the options page.' });
            port.disconnect();
            return;
        }
        if (!crawlData) {
            port.postMessage({ error: 'No crawl data available. Please start the crawl first.' });
            port.disconnect();
            return;
        }

        // Prepare the site content using maxContentLength
        const pageCount = crawlData.length;
        const maxPageLength = Math.floor(maxContentLength / pageCount);
        let siteContent = '';

        for (const page of crawlData) {
            if (page.markdown) {
                const title = page.metadata.title || 'No Title';
                const url = page.metadata.sourceURL || 'No URL';
                let pageContent = `Page Title: ${title}\nURL: ${url}\nContent:\n${page.markdown}\n\n`;
                
                // Truncate each page's content if it exceeds the maximum allowed length per page
                if (pageContent.length > maxPageLength) {
                    pageContent = pageContent.substring(0, maxPageLength) + '...';
                }
                siteContent += pageContent;
                siteContent += "[END OF PAGE]\n";
                // Break if the total content length exceeds the maximum allowed
                if (siteContent.length > maxContentLength) {
                    siteContent = siteContent.substring(0, maxContentLength) + '...';
                    break;
                }
            }
        }

        // Get the current date in a readable format
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        const currentDate = new Date().toLocaleDateString('en-US', options);

        const messages = [
            {
                "role": "system",
                "content": `You are a helpful assistant that answers questions about the content of a website as of ${currentDate}. Use the provided page titles and URLs to reference where information comes from. Include links in Markdown format when appropriate.`
            },
            {
                "role": "user",
                "content": "Here is the content of the website:\n\n" + siteContent
            }
        ];

        // Add conversation history
        messages.push(...conversationHistory);
        // Add latest user question
        messages.push({
            "role": "user",
            "content": question
        });

        const apiUrl = 'https://api.openai.com/v1/chat/completions';
        /**
         * OpenAI API request configuration
         * @type {Object} Configuration object for the chat completion request
         * @property {string} model - The GPT model to use
         * @property {Array<Object>} messages - The conversation history and context
         * @property {boolean} stream - Whether to stream the response
         * @property {number} temperature - Controls randomness in the response
         */
        const data = {
            model: model,  
            messages: messages,
            stream: true,
            temperature: 0.1
        };

        fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + openaiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            if (!response.ok) {
                response.json().then(errorData => {
                    port.postMessage({ error: errorData.error.message });
                    port.disconnect();
                });
                return;
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let assistantMessage = '';
            let buffer = '';

            function readChunk() {
                reader.read().then(({ done, value }) => {
                    if (done) {
                        // Handle the end of the stream
                        port.postMessage({ done: true });
                        // Update conversation history
                        conversationHistory.push({ role: 'user', content: question });
                        conversationHistory.push({ role: 'assistant', content: assistantMessage });
                        conversationHistories[domain] = conversationHistory;
                        chrome.storage.local.set({ conversationHistories: conversationHistories });
                        port.disconnect();
                        return;
                    }
            
                    // Accumulate the decoded chunk in the buffer
                    buffer += decoder.decode(value);
            
                    // Split the buffer into lines
                    let lines = buffer.split('\n');
            
                    // Keep the last line in the buffer if it's incomplete
                    buffer = lines.pop();
            
                    for (const line of lines) {
                        if (line.trim() === '') continue;
            
                        const message = line.replace(/^data: /, '');
                        if (message === '[DONE]') {
                            port.postMessage({ done: true });
                            // Update conversation history
                            conversationHistory.push({ role: 'user', content: question });
                            conversationHistory.push({ role: 'assistant', content: assistantMessage });
                            conversationHistories[domain] = conversationHistory;
                            chrome.storage.local.set({ conversationHistories: conversationHistories });
                            port.disconnect();
                            return;
                        }
                        try {
                            const parsed = JSON.parse(message);
                            const content = parsed.choices[0].delta.content;
                            if (content) {
                                assistantMessage += content;
                                port.postMessage({ answer: content });
                            }
                        } catch (error) {
                            // Handle parsing errors if necessary
                            console.error('Error parsing stream message', error);
                        }
                    }
                    // Continue reading the next chunk
                    readChunk();
                }).catch(error => {
                    port.postMessage({ error: error.message });
                    port.disconnect();
                });
            }
            readChunk();
        })
        .catch(error => {
            port.postMessage({ error: error.message });
            port.disconnect();
        });
    });
}
