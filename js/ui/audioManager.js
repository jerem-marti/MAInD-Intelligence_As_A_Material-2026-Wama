/**
 * Audio Manager Module
 * Handles audio playback for different pages/states
 */

import { EventBus } from '../core/eventBus.js';

class AudioManager {
    constructor() {
        this.audioElements = {};
        this.currentAudio = null;
        this.isMuted = false;
    }

    /**
     * Initialize audio elements from DOM
     */
    initialize() {
        // Get all audio elements
        this.audioElements = {
            music: document.getElementById('audio-music'),
            askmusic: document.getElementById('audio-askmusic'),
            hello: document.getElementById('audio-hello'),
            howareyou: document.getElementById('audio-howareyou'),
            bye: document.getElementById('audio-bye'),
            worried: document.getElementById('audio-worried'),
            youreback: document.getElementById('audio-youreback')
        };

        // Set up ended event listeners
        Object.entries(this.audioElements).forEach(([name, element]) => {
            if (element) {
                element.addEventListener('ended', () => {
                    EventBus.emit('audio:ended', { name });
                });
                element.addEventListener('error', (e) => {
                    console.warn(`Audio load error for ${name}:`, e);
                });
            }
        });

        return true;
    }

    /**
     * Play audio by name
     */
    play(audioName, options = {}) {
        const element = this.audioElements[audioName];
        
        if (!element) {
            console.warn(`Audio not found: ${audioName}`);
            return;
        }

        // Stop current audio if playing
        if (this.currentAudio && this.currentAudio !== element) {
            this.stop();
        }

        // Configure audio
        element.loop = options.loop || false;
        element.volume = options.volume || 1;
        element.currentTime = options.startTime || 0;

        // Play with user interaction handling
        const playPromise = element.play();
        
        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    this.currentAudio = element;
                    EventBus.emit('audio:playing', { name: audioName });
                })
                .catch(error => {
                    console.warn(`Audio playback failed for ${audioName}:`, error);
                    EventBus.emit('audio:error', { name: audioName, error });
                });
        }
    }

    /**
     * Play audio for a specific route
     */
    playForRoute(routeConfig) {
        if (!routeConfig.audio) {
            // Stop askmusic when leaving its page (even though it loops)
            const currentAudioName = this.currentAudio ? this.getAudioName(this.currentAudio) : null;
            if (currentAudioName === 'askmusic') {
                this.stop();
                return;
            }
            // Don't stop looping audio (music, worried) when navigating to routes without audio
            // Only stop non-looping audio
            if (this.currentAudio && !this.currentAudio.loop) {
                this.stop();
            }
            return;
        }

        // Extract audio name from element ID
        const audioName = routeConfig.audio.replace('audio-', '');
        
        // Stop askmusic if navigating to a different audio route
        const currentAudioName = this.currentAudio ? this.getAudioName(this.currentAudio) : null;
        if (currentAudioName === 'askmusic' && audioName !== 'askmusic') {
            this.stop();
        }
        
        // Determine if it should loop (background music and askmusic)
        const loopingAudio = ['worried', 'music', 'askmusic'];
        const shouldLoop = loopingAudio.includes(audioName);

        console.log(`Playing audio: ${audioName}, loop: ${shouldLoop}`);
        this.play(audioName, { loop: shouldLoop });
    }

    /**
     * Stop current audio
     */
    stop() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            
            const audioName = this.getAudioName(this.currentAudio);
            EventBus.emit('audio:stopped', { name: audioName });
            
            this.currentAudio = null;
        }
    }

    /**
     * Pause current audio
     */
    pause() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            EventBus.emit('audio:paused', { name: this.getAudioName(this.currentAudio) });
        }
    }

    /**
     * Resume current audio
     */
    resume() {
        if (this.currentAudio) {
            this.currentAudio.play().catch(e => console.warn('Resume failed:', e));
            EventBus.emit('audio:resumed', { name: this.getAudioName(this.currentAudio) });
        }
    }

    /**
     * Set mute state
     */
    setMute(muted) {
        this.isMuted = muted;
        Object.values(this.audioElements).forEach(element => {
            if (element) {
                element.muted = muted;
            }
        });
        EventBus.emit('audio:muteChanged', { muted });
    }

    /**
     * Toggle mute
     */
    toggleMute() {
        this.setMute(!this.isMuted);
        return this.isMuted;
    }

    /**
     * Set volume for all audio
     */
    setVolume(volume) {
        const clampedVolume = Math.max(0, Math.min(1, volume));
        Object.values(this.audioElements).forEach(element => {
            if (element) {
                element.volume = clampedVolume;
            }
        });
        EventBus.emit('audio:volumeChanged', { volume: clampedVolume });
    }

    /**
     * Get audio name from element
     */
    getAudioName(element) {
        for (const [name, el] of Object.entries(this.audioElements)) {
            if (el === element) return name;
        }
        return 'unknown';
    }

    /**
     * Check if audio is currently playing
     */
    isPlaying() {
        return this.currentAudio && !this.currentAudio.paused;
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        this.stop();
        this.audioElements = {};
    }
}

// Export singleton instance
export const audioManager = new AudioManager();
export default audioManager;
