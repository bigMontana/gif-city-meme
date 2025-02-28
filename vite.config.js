export default {
    root: '.', // Ensure Vite looks in the root directory
    server: {
      headers: {
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin'
      }
    },
    build: {
      outDir: 'dist'
    }
  }