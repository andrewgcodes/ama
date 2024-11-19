# AMA (Ask Me Anything) AI - Chrome Extension

![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)
![Version](https://img.shields.io/badge/version-1.1-green.svg)

A Chrome extension that lets you ask questions about any website you're visiting, powered by [Firecrawl](https://www.firecrawl.dev/) and GPT-4o-mini. This extension crawls web pages, processes their content, and enables natural language interactions about the site's content.

[Install](https://chromewebstore.google.com/detail/ask-me-anything-ai/mibdopjlbhdneiiggpbbemfllnlafmoo) from Chrome Web Store

## 🌟 Features

- 🤖 Ask questions about any website's content in natural language
- 🌐 Smart web crawling that respects site structure and robots.txt
- 💬 Chat-like interface with streaming responses
- 🧠 Context-aware responses with references to specific pages
- 🔄 Maintains conversation history per domain
- ⚡ Real-time streaming responses from GPT-4o-mini
- ⚙️ Highly configurable crawling parameters
- 🔒 Secure API key management
- 📝 Markdown formatting support in responses
- 🔗 Automatic link references in answers

## 🚀 How It Works

### Crawling Process

1. **Initial Scan**: When you click "Start Crawl", the extension:
   - Validates your API keys
   - Checks the current domain
   - Initializes a new conversation history
   - Starts the Firecrawl process

2. **Progress Tracking**:
   - Shows a progress bar with real-time updates
   - Displays number of pages crawled
   - Indicates crawling status and completion

3. **Content Processing**:
   - Converts HTML to clean markdown format
   - Extracts page titles and URLs
   - Maintains source references for citations
   - Truncates content to stay within API limits

### Question-Answering Flow

1. **Content Preparation**:
   - Organizes crawled content by relevance
   - Maintains page structure and hierarchy
   - Preserves source URLs for citations

2. **AI Processing**:
   - Streams requests to GPT-4o-mini
   - Maintains conversation context
   - Generates responses with source citations

3. **Response Handling**:
   - Real-time streaming of answers
   - Markdown formatting for readability
   - Automatic link insertion
   - Source reference preservation

## ⚙️ Detailed Configuration Options

### Firecrawl Settings

#### Basic Configuration
- **API Key**: Your Firecrawl authentication key
- **Max Depth** (default: 3):
  - Controls how many links deep the crawler will go
  - Higher values explore more nested pages
  - Recommended range: 1-5 for optimal performance

#### Crawling Parameters
- **Page Limit** (default: 50):
  - Maximum number of pages to crawl
  - Higher limits allow more comprehensive coverage
  - Consider API usage when adjusting
  - Range: 1-1000 pages

- **Allow Backward Links** (default: true):
  - When enabled, crawler follows links to previously visited domains
  - Useful for sites with cross-referenced content
  - Disable to stay within single domain

#### Performance Settings
- **Timeout** (default: 20000ms):
  - Maximum time to wait for each page
  - Prevents hanging on slow-loading pages
  - Recommended range: 5000-30000ms

- **Wait For** (default: 2000ms):
  - Delay between page requests
  - Helps respect server rate limits
  - Adjust based on site's robustness
  - Range: 0-5000ms

### Content Processing Settings

- **Max Content Length** (default: 250,000 characters):
  - Maximum characters sent to GPT-4o-mini
  - Balances comprehensiveness with API limits
  - Range: 1-500,000 characters
  - Higher values may increase API costs

### Model Settings

- **Model Selection**:
  - `gpt-4o-mini`: Faster, more concise responses
  - `gpt-4o`: More detailed, nuanced answers, much more expensive
  - Choose based on your needs for speed vs. detail and cost

## 🔧 Advanced Usage

### Conversation Management

The extension maintains separate conversation histories for each domain:
```javascript
{
  "example.com": [
    {"role": "user", "content": "What is this site about?"},
    {"role": "assistant", "content": "Based on [Home Page](https://example.com), this site..."},
    // Additional messages...
  ]
}
```

### Content Formatting

The extension processes content in multiple stages:

1. **HTML Processing**:
   ```javascript
   // Example of content processing
   {
     "title": "Page Title",
     "url": "https://example.com/page",
     "content": "Processed markdown content...",
     "metadata": {
       "sourceURL": "https://example.com/page",
       "crawlTime": "2024-01-01T00:00:00Z"
     }
   }
   ```

2. **Content Organization**:
   - Groups related content
   - Maintains hierarchy
   - Preserves source references

### API Response Handling

Responses are streamed in real-time:
```javascript
// Example streaming response format
{
  "role": "assistant",
  "content": "According to [About Page](https://example.com/about)...",
  "references": [
    {"title": "About Page", "url": "https://example.com/about"},
    // Additional references...
  ]
}
```

## 📊 Performance Considerations

### Crawling Performance

- **Optimal Depth**: 2-3 levels for most sites
- **Recommended Limits**:
  - Small sites: 20-50 pages
  - Medium sites: 50-200 pages
  - Large sites: 200-500 pages
- **Rate Limiting**: Automatically handles server restrictions

### Memory Usage

The extension manages memory by:
- Truncating large pages
- Clearing old conversation histories
- Optimizing content storage

## 🛡️ Security Features

- API keys stored securely in Chrome storage
- Content sanitization for XSS prevention
- Secure communication with APIs
- Rate limiting protection

## 🔍 Troubleshooting

### Common Issues

1. **Crawling Failures**:
   - Check API key validity
   - Verify site accessibility
   - Adjust timeout settings
   - Check for rate limiting

2. **Response Issues**:
   - Verify content length limits
   - Check API quota
   - Validate model selection

3. **Performance Problems**:
   - Reduce crawl depth
   - Lower page limits
   - Increase timeouts

## 🤝 Contributing

We welcome contributions! Areas of focus:

- Performance optimizations
- UI/UX improvements
- Additional model support
- Enhanced error handling
- Documentation improvements

## 📘 API Documentation

### Firecrawl API

```javascript
// Example Firecrawl API request
{
  "url": "https://example.com",
  "scrapeOptions": {
    "formats": ["markdown"],
    "waitFor": 2000,
    "timeout": 20000
  },
  "limit": 50,
  "allowBackwardLinks": true,
  "maxDepth": 3
}
```

### OpenAI API

```javascript
// Example OpenAI API request
{
  "model": "gpt-4o-mini",
  "messages": [
    {"role": "system", "content": "..."},
    {"role": "user", "content": "..."}
  ],
  "stream": true,
  "temperature": 0.1
}
```

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Firecrawl](https://www.firecrawl.dev/) for providing the web crawling infrastructure and sponsoring this project

## 📞 Support

For support:

1. Check [Troubleshooting Guide](#-troubleshooting)
2. Review existing GitHub issues
3. Create new issues with:
   - Detailed problem description
   - Steps to reproduce
   - Relevant settings/configuration
   - Error messages if any

## 🔄 Updates

Stay updated with latest releases:
- Watch this repository
- Check the [CHANGELOG](CHANGELOG.md)
- Follow release announcements

---

Made with ❤️ by [Andrew Gao](https://x.com/itsandrewgao)

Use responsibly and in accordance with all applicable terms of service and robots.txt policies.