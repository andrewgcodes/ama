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

chrome.runtime.onConnect.addListener(function(port) {
    if (port.name === 'openaiStream') {
        port.onMessage.addListener(function(request) {
            if (request.action === 'askQuestionStream') {
                askQuestionStream(request.question, port);
            }
        });
    }
});

function startCrawl(url) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['firecrawlKey', 'maxDepth', 'limit', 'timeout', 'allowBackwardLinks', 'waitFor'], function(result) {
            const firecrawlKey = result.firecrawlKey;
            const maxDepth = result.maxDepth || 3;
            const limit = result.limit || 50;
            const timeout = result.timeout || 20000; // Tiempo de espera predeterminado en milisegundos
            const allowBackwardLinks = typeof result.allowBackwardLinks !== 'undefined' ? result.allowBackwardLinks : true;
            const waitFor = result.waitFor || 2000; // Tiempo de espera predeterminado en milisegundos

            if (!firecrawlKey) {
                resolve({ success: false, error: 'Clave API de Firecrawl no configurada. Por favor, configúrela en la página de opciones.' });
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
                    resolve({ success: false, error: 'Error al iniciar el rastreo. Por favor, verifique su clave API y URL.' });
                }
            })
            .catch(error => {
                resolve({ success: false, error: error.message });
            });
        });
    });
}


function checkCrawlStatus(crawlId) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['firecrawlKey'], function(result) {
            const firecrawlKey = result.firecrawlKey;
            if (!firecrawlKey) {
                resolve({status: 'error', error: 'Clave API de Firecrawl no configurada.'});
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
                    resolve({status: 'error', error: 'Estado de rastreo desconocido.'});
                }
            }).catch(error => {
                resolve({status: 'error', error: error.message});
            });
        });
    });
}

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
            port.postMessage({ error: 'Clave API de OpenAI no configurada. Por favor, configúrela en la página de opciones.' });
            port.disconnect();
            return;
        }
        if (!crawlData) {
            port.postMessage({ error: 'No hay datos de rastreo disponibles. Por favor, inicie el rastreo primero.' });
            port.disconnect();
            return;
        }

        // Prepare the site content using maxContentLength
        const pageCount = crawlData.length;
        const maxPageLength = Math.floor(maxContentLength / pageCount);
        let siteContent = '';

        for (const page of crawlData) {
            if (page.markdown) {
                const title = page.metadata.title || 'Sin Título';
                const url = page.metadata.sourceURL || 'Sin URL';
                let pageContent = `Título de Página: ${title}\nURL: ${url}\nContenido:\n${page.markdown}\n\n`;
                
                // Truncate each page's content if it exceeds the maximum allowed length per page
                if (pageContent.length > maxPageLength) {
                    pageContent = pageContent.substring(0, maxPageLength) + '...';
                }
                siteContent += pageContent;
                siteContent += "[FIN DE PÁGINA]\n";
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
                "content": `Eres un asistente útil que responde preguntas sobre el contenido de un sitio web a partir de ${currentDate}. Utiliza los títulos de página y URLs proporcionados para referenciar de dónde proviene la información. Incluye enlaces en formato Markdown cuando sea apropiado.`
            },
            {
                "role": "user",
                "content": "Aquí está el contenido del sitio web:\n\n" + siteContent
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
                        // Actualizar el historial de conversación con la pregunta y respuesta
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
