// Script to generate iOS app icon from the Multiloop sparkles design
// Run with: node scripts/generate-app-icon.js

const fs = require('fs');
const path = require('path');

async function generateIcon() {
  const size = 1024;
  const iconScale = 0.5; // Icon takes up 50% of the image

  // Create the SVG matching our Multiloop favicon design (sparkles with purple gradient)
  const svgIcon = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#9333EA"/>
      <stop offset="100%" style="stop-color:#6366F1"/>
    </linearGradient>
  </defs>
  <!-- Background - no rounded corners for iOS (system applies mask) -->
  <rect width="${size}" height="${size}" fill="url(#bg)"/>
  <!-- Sparkles icon - centered and scaled -->
  <g transform="translate(${size * 0.25}, ${size * 0.25}) scale(${size * iconScale / 24})"
     stroke="white"
     stroke-width="1.8"
     stroke-linecap="round"
     stroke-linejoin="round"
     fill="none">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    <path d="M5 3v4"/>
    <path d="M19 17v4"/>
    <path d="M3 5h4"/>
    <path d="M17 19h4"/>
  </g>
</svg>`;

  // Output paths for Capacitor iOS project
  const outputDir = path.join(__dirname, '..', 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset');
  const svgPath = path.join(outputDir, 'AppIcon.svg');
  const pngPath = path.join(outputDir, 'AppIcon-512@2x.png');

  // Also generate PWA icons in public folder
  const publicIconsDir = path.join(__dirname, '..', 'public', 'icons');

  // Ensure directories exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  if (!fs.existsSync(publicIconsDir)) {
    fs.mkdirSync(publicIconsDir, { recursive: true });
  }

  // Write SVG file as backup
  fs.writeFileSync(svgPath, svgIcon);
  console.log('SVG icon created at:', svgPath);

  // Try to generate PNG using sharp
  try {
    const sharp = require('sharp');

    // Generate main iOS icon (1024x1024)
    await sharp(Buffer.from(svgIcon))
      .resize(1024, 1024)
      .png()
      .toFile(pngPath);
    console.log('iOS App icon (1024x1024) created at:', pngPath);

    // Generate PWA icons at various sizes
    const pwaIconSizes = [72, 96, 128, 144, 152, 192, 384, 512];
    for (const iconSize of pwaIconSizes) {
      const pwaIconPath = path.join(publicIconsDir, `icon-${iconSize}x${iconSize}.png`);
      await sharp(Buffer.from(svgIcon))
        .resize(iconSize, iconSize)
        .png()
        .toFile(pwaIconPath);
      console.log(`PWA icon (${iconSize}x${iconSize}) created at:`, pwaIconPath);
    }

    // Generate apple-touch-icon (180x180)
    const appleTouchIconPath = path.join(__dirname, '..', 'public', 'apple-touch-icon.png');
    await sharp(Buffer.from(svgIcon))
      .resize(180, 180)
      .png()
      .toFile(appleTouchIconPath);
    console.log('Apple touch icon (180x180) created at:', appleTouchIconPath);

    console.log('\nAll app icons generated successfully!');

    // Clean up SVG (we only need the PNG)
    fs.unlinkSync(svgPath);

  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND') {
      console.log('\nSharp module not found. Install it with: npm install sharp --save-dev');
      console.log('\nAlternatively, convert the SVG manually using:');
      console.log('1. Online: https://cloudconvert.com/svg-to-png (set 1024x1024)');
      console.log('2. ImageMagick: convert AppIcon.svg -resize 1024x1024 AppIcon-512@2x.png');
      console.log('3. Inkscape: inkscape -w 1024 -h 1024 AppIcon.svg -o AppIcon-512@2x.png');
      console.log('\nThen place the PNG at:', pngPath);
    } else {
      console.error('Error generating PNG:', e.message);
      console.log('\nPlease convert the SVG manually using an online converter.');
    }
  }
}

generateIcon().catch(console.error);
