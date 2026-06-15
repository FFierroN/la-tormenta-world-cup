/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Marca: dorado sobre azul marino (color del fondo del logo)
        oro: "#E9A82E",
        "oro-dark": "#C8881A",
        // Paleta: fondo negro + cajitas azul marino muy oscuro:
        carbon: "#000000",        // fondo base (negro)
        "carbon-soft": "#020A18", // superficies internas (mas oscuras, para contraste)
        "carbon-card": "#010D26", // tarjetas / cajitas
        borde: "#0C1D38",         // bordes azulados (sutiles, definen las cajitas)
        // Alias historico del marino (por si quedan usos viejos)
        marino: "#010D26",
        // Paleta neon WC26 (rediseno piloto). Usar con proposito, no decorar de mas.
        neon: {
          menta: "#3DF5C0",
          azul: "#2E6BFF",
          purpura: "#A24BFF",
          naranja: "#FF5A2C",
          lima: "#C6FF3D",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        // Titulos estilo WC26: condensada ultra-bold (alternativa gratis a la oficial FIFA).
        display: ["Anton", "Saira Condensed", "Impact", "sans-serif"],
      },
    },
  },
  plugins: [],
};
