# AMA (Pregúntame Cualquier Cosa) IA - Extensión de Chrome

![Licencia](https://img.shields.io/badge/license-Apache%202.0-blue.svg)
![Versión](https://img.shields.io/badge/version-1.1-green.svg)

Una extensión de Chrome que te permite hacer preguntas sobre cualquier sitio web que estés visitando, impulsada por [Firecrawl](https://www.firecrawl.dev/) y GPT-4o-mini. Esta extensión rastrea páginas web, procesa su contenido y permite interacciones en lenguaje natural sobre el contenido del sitio.

[Instalar](https://chromewebstore.google.com/detail/ask-me-anything-ai/mibdopjlbhdneiiggpbbemfllnlafmoo) desde Chrome Web Store

---
[🌐 English Version](#english-version)

## 🌟 Características

- 🤖 Haz preguntas sobre el contenido de cualquier sitio web en lenguaje natural
- 🌐 Rastreo web inteligente que respeta la estructura del sitio y robots.txt
- 💬 Interfaz tipo chat con respuestas en tiempo real
- 🧠 Respuestas contextuales con referencias a páginas específicas
- 🔄 Mantiene historial de conversación por dominio
- ⚡ Respuestas en tiempo real desde GPT-4o-mini
- ⚙️ Parámetros de rastreo altamente configurables
- 🔒 Gestión segura de claves API
- 📝 Soporte de formato Markdown en respuestas
- 🔗 Referencias automáticas de enlaces en respuestas

## 🚀 Cómo Funciona

### Proceso de Rastreo

1. **Escaneo Inicial**: Al hacer clic en "Iniciar Rastreo", la extensión:
   - Valida tus claves API
   - Verifica el dominio actual
   - Inicializa un nuevo historial de conversación
   - Inicia el proceso de Firecrawl

2. **Seguimiento del Progreso**:
   - Muestra una barra de progreso con actualizaciones en tiempo real
   - Muestra el número de páginas rastreadas
   - Indica el estado y finalización del rastreo

3. **Procesamiento de Contenido**:
   - Convierte HTML a formato markdown limpio
   - Extrae títulos de páginas y URLs
   - Mantiene referencias de fuentes para citas
   - Trunca el contenido para mantenerse dentro de los límites de la API

### Flujo de Preguntas y Respuestas

1. **Preparación del Contenido**:
   - Organiza el contenido rastreado por relevancia
   - Mantiene la estructura y jerarquía de páginas
   - Preserva URLs de origen para citas

2. **Procesamiento de IA**:
   - Envía solicitudes en streaming a GPT-4o-mini
   - Mantiene el contexto de la conversación
   - Genera respuestas con citas de fuentes

3. **Manejo de Respuestas**:
   - Streaming en tiempo real de respuestas
   - Formato Markdown para mejor legibilidad
   - Inserción automática de enlaces
   - Preservación de referencias de origen

## ⚙️ Opciones Detalladas de Configuración

### Configuración de Firecrawl

#### Configuración Básica
- **API Key**: Tu clave de autenticación de Firecrawl
- **Profundidad Máxima** (maxDepth, predeterminado: 3):
  - Controla cuántos niveles de enlaces explorará el rastreador
  - Valores más altos exploran más páginas anidadas
  - Rango recomendado: 1-5 para rendimiento óptimo

#### Parámetros de Rastreo
- **Límite de Páginas** (default: 50):
  - Número máximo de páginas a rastrear
  - Límites más altos permiten una cobertura más completa
  - Considerar el uso de API al ajustar
  - Rango: 1-1000 páginas

- **Permitir Enlaces Hacia Atrás** (allowBackwardLinks, predeterminado: true):
  - Cuando está activado, el rastreador sigue enlaces a dominios previamente visitados
  - Útil para sitios con contenido interreferenciado
  - Desactivar para mantenerse dentro de un solo dominio

#### Configuración de Rendimiento
- **Tiempo de Espera** (timeout, predeterminado: 20000ms):
  - Tiempo máximo de espera para cada página
  - Evita bloqueos en páginas de carga lenta
  - Rango recomendado: 5000-30000ms

- **Esperar** (waitFor, predeterminado: 2000ms):
  - Retraso entre solicitudes de página
  - Ayuda a respetar límites de velocidad del servidor
  - Ajustar según la robustez del sitio
  - Rango: 0-5000ms

### Configuración de Procesamiento de Contenido

- **Longitud Máxima de Contenido** (maxContentLength, predeterminado: 250,000 caracteres):
  - Máximo de caracteres enviados a GPT-4o-mini
  - Equilibra la exhaustividad con los límites de la API
  - Rango: 1-500,000 caracteres
  - Valores más altos pueden aumentar los costos de API

### Configuración del Modelo

- **Selección de Modelo**:
  - `gpt-4o-mini`: Respuestas más rápidas y concisas
  - `gpt-4o`: Respuestas más detalladas y matizadas, mucho más costoso
  - Elegir según tus necesidades de velocidad vs. detalle y costo

## 🔧 Uso Avanzado

### Gestión de Conversaciones

La extensión mantiene historiales de conversación separados para cada dominio:
```javascript
{
  "example.com": [
    {"role": "user", "content": "What is this site about?"},
    {"role": "assistant", "content": "Based on [Home Page](https://example.com), this site..."},
    // Additional messages...
  ]
}
```

### Formato de Contenido

La extensión procesa el contenido en múltiples etapas:

1. **Procesamiento HTML**:
   ```javascript
   // Ejemplo de procesamiento de contenido
   {
     "title": "Título de la Página",
     "url": "https://example.com/page",
     "content": "Contenido markdown procesado...",
     "metadata": {
       "sourceURL": "https://example.com/page",
       "crawlTime": "2024-01-01T00:00:00Z"
     }
   }
   ```

2. **Organización del Contenido**:
   - Agrupa contenido relacionado
   - Mantiene la jerarquía
   - Preserva referencias de origen

### Manejo de Respuestas de API

Las respuestas se transmiten en tiempo real:
```javascript
// Ejemplo de formato de respuesta en streaming
{
  "role": "assistant",
  "content": "Según la [Página Acerca de](https://example.com/about)...",
  "references": [
    {"title": "Página Acerca de", "url": "https://example.com/about"},
    // Referencias adicionales...
  ]
}
```

## 📊 Consideraciones de Rendimiento

### Rendimiento del Rastreo

- **Profundidad Óptima**: 2-3 niveles para la mayoría de los sitios
- **Límites Recomendados**:
  - Sitios pequeños: 20-50 páginas
  - Sitios medianos: 50-200 páginas
  - Sitios grandes: 200-500 páginas
- **Límite de Velocidad**: Maneja automáticamente las restricciones del servidor

### Uso de Memoria

La extensión gestiona la memoria mediante:
- Truncamiento de páginas grandes
- Limpieza de historiales de conversación antiguos
- Optimización del almacenamiento de contenido

## 🛡️ Características de Seguridad

- Claves API almacenadas de forma segura en el almacenamiento de Chrome
- Sanitización de contenido para prevención de XSS
- Comunicación segura con APIs
- Protección de límite de velocidad

## 🔍 Solución de Problemas

### Problemas Comunes

1. **Fallos de Rastreo**:
   - Verificar validez de la clave API
   - Comprobar accesibilidad del sitio
   - Ajustar configuración de tiempo de espera
   - Verificar límites de velocidad

2. **Problemas de Respuesta**:
   - Verificar límites de longitud de contenido
   - Comprobar cuota de API
   - Validar selección de modelo

3. **Problemas de Rendimiento**:
   - Reducir profundidad de rastreo
   - Disminuir límites de páginas
   - Aumentar tiempos de espera

## 🤝 Contribuciones

¡Damos la bienvenida a las contribuciones! Áreas de enfoque:

- Optimizaciones de rendimiento
- Mejoras de UI/UX
- Soporte para modelos adicionales
- Mejora en el manejo de errores
- Mejoras en la documentación

## 📘 Documentación de API

### API de Firecrawl

```javascript
// Ejemplo de solicitud a la API de Firecrawl
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

### API de OpenAI

```javascript
// Ejemplo de solicitud a la API de OpenAI
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

## 📄 Licencia

Este proyecto está licenciado bajo Apache License 2.0 - consulta el archivo [LICENSE](LICENSE) para más detalles.

## 🙏 Agradecimientos

- [Firecrawl](https://www.firecrawl.dev/) por proporcionar la infraestructura de rastreo web y patrocinar este proyecto

## 📞 Soporte

Para obtener soporte:

1. Consulta la [Guía de Solución de Problemas](#-solución-de-problemas)
2. Revisa los issues existentes en GitHub
3. Crea nuevos issues incluyendo:
   - Descripción detallada del problema
   - Pasos para reproducir
   - Configuración relevante
   - Mensajes de error si los hay

## 🔄 Actualizaciones

Mantente actualizado con las últimas versiones:
- Observa este repositorio
- Consulta el [CHANGELOG](CHANGELOG.md)
- Sigue los anuncios de lanzamientos

---

Hecho con ❤️ por [Andrew Gao](https://x.com/itsandrewgao)

Usar de manera responsable y de acuerdo con todos los términos de servicio aplicables y políticas de robots.txt.

---

# English Version

[🌐 Versión en Español](#ama-pregúntame-cualquier-cosa-ia---extensión-de-chrome)

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

1. **Initial Scan**: When clicking "Start Crawl", the extension:
   - Validates your API keys
   - Verifies current domain
   - Initializes new conversation history
   - Starts Firecrawl process

2. **Progress Tracking**:
   - Shows real-time progress bar
   - Displays number of pages crawled
   - Indicates crawl status and completion

3. **Content Processing**:
   - Converts HTML to clean markdown
   - Extracts page titles and URLs
   - Maintains source references for citations
   - Truncates content to stay within API limits

### Question & Answer Flow

1. **Content Preparation**:
   - Organizes crawled content by relevance
   - Maintains page structure and hierarchy
   - Preserves source URLs for citations

2. **AI Processing**:
   - Streams requests to GPT-4o-mini
   - Maintains conversation context
   - Generates source-cited responses

3. **Response Handling**:
   - Real-time response streaming
   - Markdown formatting for readability
   - Automatic link insertion
   - Source reference preservation

## ⚙️ Detailed Configuration Options

### Firecrawl Configuration

#### Basic Settings
- **API Key**: Your Firecrawl authentication key
- **Max Depth** (maxDepth, default: 3):
  - Controls how many levels of links the crawler will explore
  - Higher values explore more nested pages
  - Recommended range: 1-5 for optimal performance

#### Crawling Parameters
- **Page Limit** (default: 50):
  - Maximum number of pages to crawl
  - Higher limits allow more complete coverage
  - Consider API usage when adjusting
  - Range: 1-1000 pages

- **Allow Backward Links** (allowBackwardLinks, default: true):
  - When enabled, crawler follows links to previously visited domains
  - Useful for sites with cross-referenced content
  - Disable to stay within a single domain

#### Performance Settings
- **Timeout** (timeout, default: 20000ms):
  - Maximum wait time per page
  - Prevents hanging on slow-loading pages
  - Recommended range: 5000-30000ms

- **Wait For** (waitFor, default: 2000ms):
  - Delay between page requests
  - Helps respect server rate limits
  - Adjust based on site robustness
  - Range: 0-5000ms

### Content Processing Configuration

- **Max Content Length** (maxContentLength, default: 250,000 characters):
  - Maximum characters sent to GPT-4o-mini
  - Balances thoroughness with API limits
  - Range: 1-500,000 characters
  - Higher values may increase API costs

### Model Configuration

- **Model Selection**:
  - `gpt-4o-mini`: Faster, more concise responses
  - `gpt-4o`: More detailed and nuanced responses, much more expensive
  - Choose based on your speed vs. detail and cost needs

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
   // Example content processing
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
- Secure API communication
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
