import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import basicSsl from '@vitejs/plugin-basic-ssl'

const plugins = [react()];

if (process.env.VITE_SSL === "1") {
  plugins.push(basicSsl());
}

export default defineConfig({
  plugins,
})
