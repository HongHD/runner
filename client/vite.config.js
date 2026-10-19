import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    // client/.env 또는 OS 환경변수의 VITE_API_TARGET 값을 읽음 (없으면 내 PC의 5000번 서버)
    const env = loadEnv(mode, process.cwd(), '')
    const apiTarget = env.VITE_API_TARGET || 'http://localhost:5000'

    return {
        plugins: [react()],

        // [내 PC 개발용] npm run dev 할 때만 사용됨 (Cloudtype 배포에는 영향 없음)
        server: {
            host: true,
            port: 5173,
            proxy: {
                '/api': { target: apiTarget, changeOrigin: true },
                '/uploads': { target: apiTarget, changeOrigin: true },
                '/socket.io': { target: apiTarget, ws: true }
            }
        },

        // [Cloudtype 배포용] npm run build 결과물(client/dist)을 서버(Express)가 제공함
        build: {
            outDir: 'dist',
            emptyOutDir: true
        },

        // npm run preview 로 배포 결과를 내 PC에서 미리보기 할 때도 같은 프록시 사용
        preview: {
            host: true,
            port: 4173,
            proxy: {
                '/api': { target: apiTarget, changeOrigin: true },
                '/uploads': { target: apiTarget, changeOrigin: true },
                '/socket.io': { target: apiTarget, ws: true }
            }
        }
    }
})
