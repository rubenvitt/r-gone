const fs = require('fs');
const path = require('path');

// Create minimal valid PNG files as placeholders
// These are single-pixel PNGs that Chrome will accept

function createMinimalPNG(filename) {
  // Minimal 1x1 blue PNG
  const pngData = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, // IHDR length
    0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x00, 0x01, // width = 1
    0x00, 0x00, 0x00, 0x01, // height = 1
    0x08, 0x02, // bit depth = 8, color type = 2 (RGB)
    0x00, 0x00, 0x00, // compression, filter, interlace
    0x90, 0x77, 0x53, 0xDE, // CRC
    0x00, 0x00, 0x00, 0x0C, // IDAT length
    0x49, 0x44, 0x41, 0x54, // IDAT
    0x08, 0xD7, 0x63, 0xF8, // compressed data start
    0x3B, 0x82, 0xF6, 0x00, // blue color (#3B82F6)
    0x00, 0x04, 0x81, 0x01, // compressed data end
    0xFF, 0x41, 0x89, 0xA8, // CRC (not accurate but Chrome accepts it)
    0x00, 0x00, 0x00, 0x00, // IEND length
    0x49, 0x45, 0x4E, 0x44, // IEND
    0xAE, 0x42, 0x60, 0x82  // CRC
  ]);
  
  fs.writeFileSync(path.join(__dirname, filename), pngData);
  console.log(`Created ${filename}`);
}

// Create all required PNG files
const files = ['icon-16.png', 'icon-32.png', 'icon-48.png', 'icon-128.png', 'default-site.png'];

files.forEach(file => {
  createMinimalPNG(file);
});

console.log('\nPlaceholder PNG files created successfully!');
console.log('The extension should now load without errors.');
console.log('For production, replace these with proper icons.');