/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                admin: {
                    navBg: '#1e293b', // slate-800
                    mainBg: '#f1f5f9', // slate-100
                    card: '#ffffff',
                    primary: '#3b82f6', // blue-500
                    accent: '#10b981', // emerald-500
                },
                player: {
                    bg: '#4f46e5', // indigo-600
                    card: '#ffffff',
                    primary: '#ec4899', // pink-500
                }
            }
        },
    },
    plugins: [],
}
