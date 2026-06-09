/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Marca: dorado sobre azul marino (color del fondo del logo)
        oro: "#E9A82E",
        "oro-dark": "#C8881A",
        // Paleta azul marino coordinada (base oscura -> tarjetas mas claras):
        carbon: "#172842",        // fondo base (igual al fondo del logo)
        "carbon-soft": "#1F3354", // superficies levemente elevadas
        "carbon-card": "#243A60", // tarjetas
        borde: "#36507A",         // bordes azulados
        // Alias historico del marino (por si quedan usos viejos)
        marino: "#172842",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};
