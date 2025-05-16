// tailwind.config.js
module.exports = {
  content: [
    // ... your other content paths
    "./node_modules/figscript/dist/**/*.{js,ts,jsx,tsx}", // If FigScript itself uses Tailwind (not typical for this setup)
    "./src/**/*.{js,ts,jsx,tsx}", // Where you use FigScript components
  ],
  theme: {
    extend: {
      colors: {
        // Example: if you use 'layer-1' with FigScript's Fill prop
        'layer-1': '#f0f0f0',
        'layer-2': '#e0e0e0',
      }
    },
  },
  plugins: [],
  safelist: [
    { pattern: /gap-\[\d+px\]/ },
    { pattern: /px-\[\d+px\]/ },
    { pattern: /py-\[\d+px\]/ },
    { pattern: /left-\[\d+px\]/ },
    { pattern: /top-\[\d+px\]/ },
    { pattern: /rotate-\[\d+deg\]/ },
    { pattern: /rounded-\[\d+px\]/ },
    { pattern: /opacity-(0|5|10|20|25|30|40|50|60|70|75|80|90|95|100)/ },
    // Add patterns for any custom values you expect to use
    // e.g., bg-layer-1, w-[100px], h-[50%]
    'bg-layer-1', // if used directly
    'bg-layer-2',
    // Width/Height patterns (consider if you support fixed values beyond px)
    { pattern: /w-\[\d+px\]/ }, { pattern: /w-\d+\/\d+/ },
    { pattern: /h-\[\d+px\]/ }, { pattern: /h-\d+\/\d+/ },
  ],
};