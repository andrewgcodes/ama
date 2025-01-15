/**
 * options.js - Configuration Manager for Ask Me Anything AI Chrome Extension
 * 
 * This script handles the extension's configuration interface, including:
 * - API key management (Firecrawl and OpenAI)
 * - Crawl settings configuration
 * - Input validation
 * - Settings persistence in chrome.storage
 */

/**
 * Saves extension configuration when the save button is clicked
 * @listens click
 * 
 * Configuration options:
 * @param {string} firecrawlKey - API key for Firecrawl service
 * @param {string} openaiKey - API key for OpenAI service
 * @param {number} maxDepth - Maximum crawl depth (default: 3)
 * @param {number} limit - Maximum pages to crawl (default: 50)
 * @param {number} maxContentLength - Maximum content length in characters (1-500,000)
 * @param {number} timeout - Request timeout in milliseconds (minimum: 1)
 * @param {boolean} allowBackwardLinks - Whether to follow backward links
 * @param {number} waitFor - Wait time before scraping in milliseconds (minimum: 0)
 * @param {string} model - OpenAI model to use (default: 'gpt-4o-mini')
 * 
 * Side effects:
 * - Validates all inputs
 * - Shows error messages for invalid inputs
 * - Updates chrome.storage.local with new settings
 * - Displays success message on save
 */
document.getElementById('save').addEventListener('click', function() {
    const firecrawlKey = document.getElementById('firecrawlKey').value.trim();
    const openaiKey = document.getElementById('openaiKey').value.trim();
    const maxDepth = parseInt(document.getElementById('maxDepth').value.trim()) || 3;
    const limit = parseInt(document.getElementById('limit').value.trim()) || 50;
    const maxContentLength = parseInt(document.getElementById('maxContentLength').value.trim()) || 250000;
    const timeout = parseInt(document.getElementById('timeout').value.trim()) || 20000;
    const allowBackwardLinks = document.getElementById('allowBackwardLinks').value === 'true';
    const waitFor = parseInt(document.getElementById('waitFor').value.trim()) || 2000;
    const model = document.getElementById('model').value || 'gpt-4o-mini';

    // validate inputs
    if (isNaN(maxContentLength) || maxContentLength < 1 || maxContentLength > 500000) {
        alert('Please enter a valid max characters value (1 - 500,000).');
        return;
    }
    if (isNaN(timeout) || timeout < 1) {
        alert('Please enter a valid timeout in milliseconds (minimum 1).');
        return;
    }
    if (isNaN(waitFor) || waitFor < 0) {
        alert('Please enter a valid wait time in milliseconds (minimum 0).');
        return;
    }

    chrome.storage.local.set({
        firecrawlKey: firecrawlKey,
        openaiKey: openaiKey,
        maxDepth: maxDepth,
        limit: limit,
        maxContentLength: maxContentLength,
        timeout: timeout,
        allowBackwardLinks: allowBackwardLinks,
        waitFor: waitFor,
        model: model
    }, function() {
        const successMessage = document.getElementById('successMessage');
        successMessage.style.display = 'block';

        setTimeout(() => {
            successMessage.style.display = 'none';
        }, 3000);
    });
});

/**
 * Loads saved configuration when the options page is opened
 * @listens DOMContentLoaded
 * 
 * Retrieves and populates:
 * - API keys
 * - Crawl depth and limits
 * - Content length settings
 * - Timeout configurations
 * - Model selection
 * 
 * Side effects:
 * - Reads from chrome.storage.local
 * - Updates form input values
 */
document.addEventListener('DOMContentLoaded', function() {
    chrome.storage.local.get([
        'firecrawlKey',
        'openaiKey',
        'maxDepth',
        'limit',
        'maxContentLength',
        'timeout',
        'allowBackwardLinks',
        'waitFor',
        'model'
    ], function(result) {
        if (result.firecrawlKey) {
            document.getElementById('firecrawlKey').value = result.firecrawlKey;
        }
        if (result.openaiKey) {
            document.getElementById('openaiKey').value = result.openaiKey;
        }
        if (result.maxDepth) {
            document.getElementById('maxDepth').value = result.maxDepth;
        }
        if (result.limit) {
            document.getElementById('limit').value = result.limit;
        }
        if (result.maxContentLength) {
            document.getElementById('maxContentLength').value = result.maxContentLength;
        }
        if (result.timeout) {
            document.getElementById('timeout').value = result.timeout;
        }
        if (typeof result.allowBackwardLinks !== 'undefined') {
            document.getElementById('allowBackwardLinks').value = result.allowBackwardLinks.toString();
        }
        if (result.waitFor) {
            document.getElementById('waitFor').value = result.waitFor;
        }
        if (result.model) {
            document.getElementById('model').value = result.model;
        }
    });
});
