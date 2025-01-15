/**
 * @fileoverview Options page script for the AMA Chrome extension.
 * Handles saving and loading of extension settings, including API keys
 * and crawling parameters. Provides validation and persistence of user
 * preferences through Chrome's storage API.
 */

/**
 * Settings and their purposes:
 * @typedef {Object} ExtensionSettings
 * @property {string} firecrawlKey - API key for Firecrawl web crawling service
 * @property {string} openaiKey - API key for OpenAI's GPT service
 * @property {number} maxDepth - Maximum depth for crawling (default: 3)
 * @property {number} limit - Maximum number of pages to crawl (default: 50)
 * @property {number} maxContentLength - Maximum characters to process (1-500,000)
 * @property {number} timeout - Page load timeout in milliseconds (min: 1)
 * @property {boolean} allowBackwardLinks - Whether to follow links to parent pages
 * @property {number} waitFor - Wait time after page load in ms (min: 0)
 * @property {string} model - OpenAI model to use (default: 'gpt-4o-mini')
 */

/**
 * Event listener for the save button.
 * Validates and saves user settings to Chrome storage.
 * @description
 * Reads all input values, performs validation on numeric fields,
 * and saves to chrome.storage.local. Shows a success message
 * that automatically disappears after 3 seconds.
 * 
 * Validation rules:
 * - maxContentLength: 1-500,000 characters
 * - timeout: minimum 1ms
 * - waitFor: minimum 0ms
 * 
 * Default values are applied for missing or invalid inputs.
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
 * Initializes the options page when DOM content is loaded.
 * @description
 * Retrieves saved settings from chrome.storage.local and
 * populates the form fields with saved values or defaults.
 * Handles all extension settings:
 * - API keys (Firecrawl, OpenAI)
 * - Crawling parameters (depth, limit, timeout)
 * - Content processing settings (maxLength, model)
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
