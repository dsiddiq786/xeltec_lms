const env = {
    API_URL: import.meta.env.VITE_API_URL as string | undefined,
    AI_API_URL: import.meta.env.VITE_AI_API_URL as string | undefined,
    STRIPE_PUBLISHABLE_KEY: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined,
    APP_NAME: 'brickSkill',
    isProd: import.meta.env.PROD,
    isDev: import.meta.env.DEV,
} as const;

export default env;
