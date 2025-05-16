// tailwind.config.js
module.exports = {
  content: [
    // ... your other content paths
    "./node_modules/figscript/dist/**/*.{js,ts,jsx,tsx}", // [cite: 24]
    "./src/**/*.{js,ts,jsx,tsx}", // [cite: 24]
  ],
  theme: {
    extend: {
      colors: {
        'layer-1': '#f0f0f0', // [cite: 24]
        'layer-2': '#e0e0e0', // [cite: 24]
      }
    },
  },
  plugins: [],
  safelist: [
    // Existing good patterns
    { pattern: /gap-\[\d+px\]/ }, // [cite: 24]
    { pattern: /px-\[\d+px\]/ }, // [cite: 24]
    { pattern: /py-\[\d+px\]/ }, // [cite: 24]
    { pattern: /left-\[\d+px\]/ }, // [cite: 24]
    { pattern: /top-\[\d+px\]/ }, // [cite: 24]
    { pattern: /rotate-\[\d+deg\]/ }, // [cite: 24]
    { pattern: /rounded-\[\d+px\]/ }, // [cite: 24]
    { pattern: /opacity-(0|5|10|20|25|30|40|50|60|70|75|80|90|95|100)/ }, // [cite: 24]
    'bg-layer-1', 'bg-layer-2', // [cite: 24]
    { pattern: /w-\[\d+px\]/ }, { pattern: /w-\d+\/\d+/ }, // [cite: 24]
    { pattern: /h-\[\d+px\]/ }, { pattern: /h-\d+\/\d+/ }, // [cite: 24]

    // Additions for new Position features
    'fixed', 'relative', // 'absolute', 'sticky' if you use them elsewhere
    { pattern: /z-(10|20|30|40|50)/ }, // Or a more generic z-index pattern if needed
    'left-0', 'right-0', 'top-0', 'bottom-0',
    'left-1/2', 'top-1/2',
    '-translate-x-1/2', 'translate-x-1/2',
    '-translate-y-1/2', 'translate-y-1/2',
    'rotate-90', '-rotate-90', 'rotate-180',
    'scale-x-[-1]', 'scale-y-[-1]',
    'w-full', 'h-full',
  ],
};