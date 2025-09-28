export const TEST_CONSTANTS = {
   BASE_URL: 'http://localhost:3000',
   LANDING_PAGE: '/',
   LOGIN_PAGE: '/login',
   REGISTER_PAGE: '/register',
   DASHBOARD_PAGE: '/dashboard',
 } as const;
 
 export const SELECTORS = {
   // Landing page selectors
   LOGO: 'img[alt="Logo"]',
   TITLE: 'h1',
   SUBTITLE: 'p',
   LOGIN_BUTTON: '#login',
   REGISTER_BUTTON: '#register',
 
   // Common selectors
   LOADING_SPINNER: '[data-testid="loading"]',
   ERROR_MESSAGE: '[data-testid="error"]',
   SUCCESS_MESSAGE: '[data-testid="success"]',
 } as const;
 
 export const TEST_DATA = {
   VALID_USER: {
     username: 'testuser',
     email: 'test@example.com',
     password: 'testpassword123',
     name: 'Test User',
     birthday: '1990-01-01',
   },
   INVALID_USER: {
     username: '',
     email: 'invalid-email',
     password: '123',
     name: '',
     birthday: 'invalid-date',
   },
 } as const;
 