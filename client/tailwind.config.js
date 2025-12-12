/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                dark: {
                    900: '#0d1117',
                    800: '#161b22',
                    700: '#21262d',
                    600: '#30363d',
                    500: '#484f58',
                },
                accent: {
                    blue: '#58a6ff',
                    green: '#3fb950',
                    purple: '#a371f7',
                },
            },
            fontFamily: {
                mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
            },
        },
    },
    plugins: [],
};
