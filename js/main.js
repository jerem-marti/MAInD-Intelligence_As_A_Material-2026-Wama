/**
 * MAInD Wama - Main Entry Point
 * Smart Sink Companion Application
 * 
 * This is the main entry point that bootstraps the entire application.
 * It imports and initializes the main controller.
 */

import { appController } from './controllers/appController.js';

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log('MAInD Wama - Smart Sink Companion');
    console.log('================================');
    
    try {
        await appController.initialize();
    } catch (error) {
        console.error('Application failed to start:', error);
    }
});

// Handle page visibility changes (pause/resume)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('Page hidden - pausing...');
        // Could pause detection here if needed
    } else {
        console.log('Page visible - resuming...');
        // Could resume detection here if needed
    }
});

// Export for debugging in console
window.MAInDWama = {
    appController
};
