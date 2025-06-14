const fs = require('fs');
const path = require('path');

// Simple PNG generation using raw binary data
// This creates basic colored squares with text as placeholder icons

function createPNG(size, text = 'IG') {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  // IHDR chunk (Image Header)
  const ihdr = Buffer.concat([
    Buffer.from([0, 0, 0, 13]), // Length
    Buffer.from('IHDR'),
    Buffer.from([
      0, 0, 0, size, // Width
      0, 0, 0, size, // Height
      8, // Bit depth
      2, // Color type (RGB)
      0, // Compression
      0, // Filter
      0  // Interlace
    ]),
    Buffer.from([0, 0, 0, 0]) // CRC placeholder
  ]);
  
  // Create simple blue square image data
  const imageData = [];
  for (let y = 0; y < size; y++) {
    imageData.push(0); // Filter type
    for (let x = 0; x < size; x++) {
      // Blue color (#3b82f6)
      imageData.push(59);  // R
      imageData.push(130); // G
      imageData.push(246); // B
    }
  }
  
  // IDAT chunk (Image Data)
  const idat = Buffer.concat([
    Buffer.from([0, 0, 0, imageData.length]), // Length
    Buffer.from('IDAT'),
    Buffer.from(imageData),
    Buffer.from([0, 0, 0, 0]) // CRC placeholder
  ]);
  
  // IEND chunk (Image End)
  const iend = Buffer.concat([
    Buffer.from([0, 0, 0, 0]), // Length
    Buffer.from('IEND'),
    Buffer.from([0, 0, 0, 0]) // CRC placeholder
  ]);
  
  // Combine all chunks
  return Buffer.concat([signature, ihdr, idat, iend]);
}

// Create a simple SVG icon
function createSVG(size) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#3b82f6"/>
  <text x="${size/2}" y="${size/2}" font-family="Arial, sans-serif" font-size="${size * 0.5}" font-weight="bold" text-anchor="middle" dominant-baseline="middle" fill="white">IG</text>
</svg>`;
}

// Generate icons
const sizes = [16, 32, 48, 128];

sizes.forEach(size => {
  // Create SVG version
  const svg = createSVG(size);
  fs.writeFileSync(path.join(__dirname, `icon-${size}.svg`), svg);
  console.log(`Created icon-${size}.svg`);
});

// Create default site icon SVG
const defaultSvg = `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <rect width="32" height="32" fill="#e5e7eb"/>
  <text x="16" y="16" font-family="Arial, sans-serif" font-size="16" font-weight="bold" text-anchor="middle" dominant-baseline="middle" fill="#6b7280">?</text>
</svg>`;
fs.writeFileSync(path.join(__dirname, 'default-site.svg'), defaultSvg);

console.log('\nSVG icons created successfully!');
console.log('To convert to PNG, you can use:');
console.log('- Online converter: https://svgtopng.com/');
console.log('- Command line: Install imagemagick and run:');
sizes.forEach(size => {
  console.log(`  convert icon-${size}.svg icon-${size}.png`);
});
console.log('  convert default-site.svg default-site.png');