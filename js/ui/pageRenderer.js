/**
 * Page Renderer Module
 * Handles rendering page templates for each route
 */

import { EventBus } from '../core/eventBus.js';
import { ROUTES } from '../config/routes.js';
import { appState } from '../core/state.js';

// Page templates
const TEMPLATES = {
    idle: () => {
        // Check if detection has been started before
        const hasStartedBefore = appState.get('detectionStartedOnce');
        
        if (hasStartedBefore) {
            // Return black/inactive screen
            return `
                <div class="page-content page-idle-content page-idle-inactive">
                </div>
            `;
        }
        
        // First run - show start button
        return `
            <div class="page-content page-idle-content page-idle-firstrun">
                <div class="idle-message">
                    <p>Waiting for detection to start...</p>
                    <button id="btn-start-detection" class="btn btn-start">Start Detection</button>
                </div>
            </div>
        `;
    },

    hello: () => `
        <div class="page-content page-hello-content">
        </div>
    `,

    howareyou: () => `
        <div class="page-content page-howareyou-content">
        </div>
    `,

    working: () => `
        <div class="page-content page-working-content">
        </div>
    `,

    askmusic: () => `
        <div class="page-content page-askmusic-content">
            <div class="gesture-prompt">
                <p class="gesture-hint">👍 Yes / 👎 No</p>
                <div id="gesture-countdown" class="gesture-countdown"></div>
                <div id="hold-progress" class="hold-progress"></div>
            </div>
        </div>
    `,

    musicplaying: () => `
        <div class="page-content page-musicplaying-content">
            <div id="center-container"></div>
            <div id="corner-lottie"></div>
            <button id="btn-quit-music" class="btn btn-quit-music">Stop Music</button>
        </div>
    `,

    worried: () => `
        <div class="page-content page-worried-content">
        </div>
    `,

    youreback: () => `
        <div class="page-content page-youreback-content">
        </div>
    `,

    bye: () => `
        <div class="page-content page-bye-content">
        </div>
    `,

    sessionfinished: () => `
        <div class="page-content page-sessionfinished-content">
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
            
            // Add inactive mode class for idle page when detection was started before
            if (pageClass === 'page-idle' && appState.get('detectionStartedOnce')) {
                document.body.classList.add('page-idle-inactive-mode');
            }
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
        
        if (routeName === 'musicplaying') {
            // Use setTimeout to ensure button exists after animation setup
            setTimeout(() => {
                const quitBtn = document.getElementById('btn-quit-music');
                console.log('Binding quit button:', quitBtn);
                if (quitBtn) {
                    quitBtn.onclick = () => {
                        console.log('Quit music button clicked');
                        EventBus.emit('music:quit');
                    };
                }
            }, 200);
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
