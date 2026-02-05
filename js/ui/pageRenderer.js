/**
 * Page Renderer Module
 * Handles rendering page templates for each route
 */

import { EventBus } from '../core/eventBus.js';
import { ROUTES } from '../config/routes.js';

// Page templates
const TEMPLATES = {
    idle: () => `
        <div class="page-content page-idle-content">
            <div class="idle-message">
                <p>Waiting for detection to start...</p>
                <button id="btn-start-detection" class="btn btn-start">Start Detection</button>
            </div>
        </div>
    `,

    hello: () => `
        <div class="page-content page-hello-content">
            <nav class="page-nav">
                <a href="#howareyou" class="nav-link">How are you?</a>
                <a href="#bye" class="nav-link">Go to bye</a>
                <a href="#working" class="nav-link">Working</a>
            </nav>
        </div>
    `,

    howareyou: () => `
        <div class="page-content page-howareyou-content">
            <nav class="page-nav">
                <a href="#hello" class="nav-link">Back to hello</a>
            </nav>
        </div>
    `,

    working: () => `
        <div class="page-content page-working-content">
            <nav class="page-nav">
                <a href="#sessionfinished" class="nav-link">Session Finished?</a>
                <a href="#hello" class="nav-link">Back to hello</a>
            </nav>
        </div>
    `,

    askmusic: () => `
        <div class="page-content page-askmusic-content">
            <div class="gesture-prompt">
                <p class="gesture-hint">👍 Yes / 👎 No</p>
                <div id="gesture-countdown" class="gesture-countdown"></div>
                <div id="hold-progress" class="hold-progress"></div>
            </div>
            <nav class="page-nav">
                <a href="#hello" class="nav-link">Back to hello</a>
                <a href="#musicplaying" class="nav-link">Music Playing...</a>
            </nav>
        </div>
    `,

    musicplaying: () => `
        <div class="page-content page-musicplaying-content">
            <div id="center-container"></div>
            <div id="corner-lottie"></div>
            <nav class="page-nav">
                <a href="#sessionfinished" class="nav-link">Session Finished?</a>
                <a href="#hello" class="nav-link">Back to hello</a>
            </nav>
        </div>
    `,

    worried: () => `
        <div class="page-content page-worried-content">
            <nav class="page-nav">
                <a href="#youreback" class="nav-link">You're back</a>
                <a href="#hello" class="nav-link">Back to hello</a>
            </nav>
        </div>
    `,

    youreback: () => `
        <div class="page-content page-youreback-content">
            <nav class="page-nav">
                <a href="#hello" class="nav-link">Back to hello</a>
            </nav>
        </div>
    `,

    bye: () => `
        <div class="page-content page-bye-content">
            <nav class="page-nav">
                <a href="#hello" class="nav-link">Back to hello</a>
            </nav>
        </div>
    `,

    sessionfinished: () => `
        <div class="page-content page-sessionfinished-content">
            <nav class="page-nav">
                <a href="#hello" class="nav-link">Back to hello</a>
            </nav>
        </div>
    `
};

class PageRenderer {
    constructor() {
        this.container = null;
        this.titleElement = null;
        this.headerElement = null;
    }

    /**
     * Initialize the renderer with DOM elements
     */
    initialize() {
        this.container = document.getElementById('page-container');
        this.titleElement = document.getElementById('page-title');
        this.headerElement = document.getElementById('app-header');

        if (!this.container) {
            console.error('Page container not found');
            return false;
        }

        return true;
    }

    /**
     * Render a page by route name
     */
    render(routeName, config) {
        if (!this.container) {
            console.error('Page renderer not initialized');
            return;
        }

        const template = TEMPLATES[config.template];
        if (!template) {
            console.error(`Template not found for: ${config.template}`);
            return;
        }

        // Update body class for page-specific styles
        this.updateBodyClass(config.pageClass);

        // Update title
        if (this.titleElement) {
            this.titleElement.textContent = config.title;
        }

        // Show/hide header based on route
        if (this.headerElement) {
            if (routeName === 'idle') {
                this.headerElement.classList.add('hidden');
            } else {
                this.headerElement.classList.remove('hidden');
            }
        }

        // Render template with fade transition
        this.container.classList.add('transitioning');
        
        setTimeout(() => {
            this.container.innerHTML = template();
            this.container.classList.remove('transitioning');
            
            // Emit render complete event
            EventBus.emit('page:rendered', { routeName, config });
            
            // Bind any page-specific event listeners
            this.bindPageEvents(routeName);
        }, 150);
    }

    /**
     * Update body class for page-specific styles
     */
    updateBodyClass(pageClass) {
        // Remove all page classes
        document.body.className = document.body.className
            .split(' ')
            .filter(c => !c.startsWith('page-'))
            .join(' ');

        // Add new page class
        if (pageClass) {
            document.body.classList.add(pageClass);
        }
    }

    /**
     * Bind page-specific event listeners
     */
    bindPageEvents(routeName) {
        if (routeName === 'idle') {
            const startBtn = document.getElementById('btn-start-detection');
            if (startBtn) {
                startBtn.addEventListener('click', () => {
                    EventBus.emit('detection:start');
                });
            }
        }
    }

    /**
     * Show loading state
     */
    showLoading() {
        if (this.container) {
            this.container.innerHTML = `
                <div class="loading-state">
                    <div class="spinner"></div>
                    <p>Loading...</p>
                </div>
            `;
        }
    }

    /**
     * Show error state
     */
    showError(message) {
        if (this.container) {
            this.container.innerHTML = `
                <div class="error-state">
                    <p class="error-message">${message}</p>
                    <button onclick="location.reload()" class="btn">Retry</button>
                </div>
            `;
        }
    }
}

// Export singleton instance
export const pageRenderer = new PageRenderer();
export default pageRenderer;
