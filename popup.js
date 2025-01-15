/**
 * Este archivo maneja la interfaz de usuario del popup y la interacción con el usuario.
 * Controla el proceso de rastreo, la visualización del progreso y el chat con GPT.
 */

/**
 * Manejador de eventos para iniciar el rastreo cuando se hace clic en el botón 'startCrawl'.
 * Verifica las claves API antes de comenzar el proceso.
 */
document.getElementById('startCrawl').addEventListener('click', function() {
    document.getElementById('startCrawl').disabled = true;
    document.getElementById('status').innerText = 'Verificando claves API...';

    chrome.storage.local.get(['firecrawlKey'], function(result) {
        if (!result.firecrawlKey) {
            document.getElementById('status').innerText = 'Por favor, configure sus claves API en Configuración.';
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
 * Inicia el proceso de rastreo para la pestaña actual.
 * Configura la interfaz de usuario, muestra la barra de progreso y comienza el rastreo.
 */
function startCrawlProcess() {
    document.getElementById('status').innerText = 'Iniciando rastreo...';
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
                document.getElementById('status').innerText = 'Rastreo iniciado...';
                pollCrawlStatus(response.crawlId);
            } else {
                document.getElementById('status').innerText = 'Error al iniciar el rastreo: ' + response.error;
                document.getElementById('startCrawl').disabled = false;
                document.getElementById('progressContainer').style.display = 'none';
                stopFakeProgressBar();
                enableChat();
            }
        });
    });
}

/**
 * Inicia una barra de progreso simulada para mejorar la experiencia del usuario.
 * Avanza gradualmente hasta el 80% mientras se espera la respuesta real del servidor.
 * La simulación ayuda a mantener al usuario informado del progreso.
 */
function startFakeProgressBar() {
    const totalDuration = 6000; // Duración total en milisegundos
    const updateInterval = 25; // Actualizar cada 100ms
    const targetProgress = 80; // Progreso simulado hasta 80%
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
 * Detiene la barra de progreso simulada.
 * Se llama cuando el proceso real ha terminado o cuando ocurre un error.
 */
function stopFakeProgressBar() {
    if (fakeProgressInterval) {
        clearInterval(fakeProgressInterval);
        fakeProgressCompleted = true;
    }
}

/**
 * Actualiza el ancho de la barra de progreso al porcentaje especificado.
 * 
 * @param {number} progress - Porcentaje de progreso (0-100)
 */
function updateProgressBar(progress) {
    document.getElementById('progressBar').style.width = progress + '%';
}

/**
 * Consulta periódicamente el estado del proceso de rastreo.
 * Actualiza la interfaz de usuario con el progreso y maneja la finalización.
 * 
 * @param {string} crawlId - ID único del proceso de rastreo
 */
function pollCrawlStatus(crawlId) {
    chrome.runtime.sendMessage({action: 'checkCrawlStatus', crawlId: crawlId}, function(response) {
        if (response.status === 'completed') {
            document.getElementById('status').innerText = `Rastreo completado. ${response.total} páginas rastreadas.`;
            document.getElementById('startCrawl').disabled = false;

            updateProgressBar(100);

            setTimeout(() => {
                document.getElementById('progressContainer').style.display = 'none';
            }, 1000);

            stopFakeProgressBar();

            enableChat();

            chrome.storage.local.set({conversationHistories: {}});
        } else if (response.status === 'scraping') {
            // Actualizar mensaje de estado con el progreso
            document.getElementById('status').innerText = `Rastreo en progreso... (${response.completed}/${response.total} páginas)`;

            // Actualizar barra de progreso después de completar el progreso simulado
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
            document.getElementById('status').innerText = 'Error durante el rastreo: ' + response.error;
            document.getElementById('startCrawl').disabled = false;
            document.getElementById('progressContainer').style.display = 'none';
            stopFakeProgressBar();
            enableChat();
        } else {
            document.getElementById('status').innerText = 'Estado de rastreo inesperado.';
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
 * Envía la pregunta del usuario al servicio GPT y maneja la respuesta en streaming.
 * Gestiona la interfaz de usuario durante el proceso de pregunta y respuesta.
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
 * Agrega un nuevo mensaje al área de chat.
 * Crea elementos DOM para mostrar el mensaje y aplica el formato Markdown.
 * 
 * @param {string} sender - Origen del mensaje ('user' o 'assistant')
 * @param {string} text - Contenido del mensaje en formato Markdown
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
 * Convierte texto en formato Markdown a HTML para su visualización.
 * Maneja enlaces, negritas y escapa caracteres especiales.
 * 
 * @param {string} text - Texto en formato Markdown
 * @returns {string} - HTML formateado
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
 * Actualiza el historial de conversación con una nueva pregunta y respuesta.
 * Almacena el historial en el almacenamiento local de Chrome por dominio.
 * 
 * @param {string} question - Pregunta del usuario
 * @param {string} answer - Respuesta del asistente
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
 * Deshabilita la interfaz de chat.
 * Se utiliza durante el proceso de rastreo o cuando no hay datos disponibles.
 */
function disableChat() {
    document.getElementById('questionInput').disabled = true;
    document.getElementById('askQuestion').disabled = true;
    document.getElementById('inputSection').style.display = 'none';
    document.getElementById('chatSection').style.display = 'none';
    document.getElementById('chatSection').innerHTML = '';
}

/**
 * Habilita la interfaz de chat.
 * Se llama cuando el rastreo ha terminado y los datos están disponibles.
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
            document.getElementById('status').innerText = 'Rastreo en progreso...';
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
