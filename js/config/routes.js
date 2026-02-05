/**
 * Route Definitions
 * Defines all available routes and their configurations
 */

export const ROUTES = {
    'idle': {
        title: 'Waiting...',
        pageClass: 'page-idle',
        lottie: null,
        audio: null,
        template: 'idle'
    },
    'hello': {
        title: 'Hello',
        pageClass: 'page-hello',
        lottie: { path: 'assets/animations/hello.json', loop: false, delay: 500 },
        audio: 'audio-hello',
        template: 'hello'
    },
    'howareyou': {
        title: 'How Are You?',
        pageClass: 'page-howareyou',
        lottie: { path: 'assets/animations/hello.json', loop: false, delay: 1000 },
        audio: 'audio-howareyou',
        template: 'howareyou'
    },
    'working': {
        title: 'Wama is Here with You',
        pageClass: 'page-working',
        lottie: { path: 'assets/animations/worker.svg', loop: false, delay: 1000, isSvg: true },
        audio: null,
        template: 'working'
    },
    'askmusic': {
        title: 'Want Some Music?',
        pageClass: 'page-askmusic',
        lottie: { path: 'assets/animations/jukebox.svg', loop: false, delay: 1000, isSvg: true },
        audio: 'audio-askmusic',
        template: 'askmusic'
    },
    'musicplaying': {
        title: 'Music Playing...',
        pageClass: 'page-musicplaying',
        centerSvg: 'assets/animations/dancing.svg',
        cornerLottie: 'assets/animations/music-note.json',
        audio: 'audio-music',
        template: 'musicplaying'
    },
    'worried': {
        title: 'I still hear the water… but I don\'t see you',
        pageClass: 'page-worried',
        lottie: { path: 'assets/animations/worried.svg', loop: false, delay: 1000, isSvg: true },
        bgLottie: 'assets/animations/Waves.json',
        audio: 'audio-worried',
        template: 'worried'
    },
    'youreback': {
        title: 'Oh! You\'re back now!',
        pageClass: 'page-youreback',
        lottie: { path: 'assets/animations/youreback.svg', loop: false, delay: 1000, isSvg: true },
        audio: null,
        template: 'youreback'
    },
    'bye': {
        title: 'Bye Bye!',
        pageClass: 'page-bye',
        lottie: { path: 'assets/animations/bye.json', loop: false, delay: 500 },
        audio: 'audio-bye',
        template: 'bye'
    },
    'sessionfinished': {
        title: 'Session Finished?',
        pageClass: 'page-sessionfinished',
        lottie: { path: 'assets/animations/hello.json', loop: false, delay: 0 },
        audio: null,
        template: 'sessionfinished'
    }
};

export const DEFAULT_ROUTE = 'idle';

export default ROUTES;
