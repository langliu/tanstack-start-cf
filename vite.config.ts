import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact, { reactCompilerPreset } from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const config = defineConfig(({ command }) => ({
  optimizeDeps: {
    exclude: ['@better-auth/drizzle-adapter', 'better-auth/adapters/drizzle'],
  },
  plugins: [
    devtools(),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    command === 'build'
      ? babel({ presets: [reactCompilerPreset()] })
      : undefined,
  ],
  resolve: { tsconfigPaths: true },
  ssr: command === 'serve' ? undefined : { noExternal: true },
}))

export default config
