export default defineNuxtConfig({
  app: {
    baseURL: '/eks/',
  },
  modules: ["@nuxt/content"],
  content: {
    experimental: {
      sqliteConnector: "native",
    },
  },
});
