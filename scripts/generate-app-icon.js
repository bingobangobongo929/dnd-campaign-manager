// Script to generate iOS and PWA icons from the Multiloop logo
// Run with: node scripts/generate-app-icon.js

const fs = require('fs');
const path = require('path');

async function generateIcon() {
  // Source logo
  const logoPath = path.join(__dirname, '..', 'assets', 'logo.png');

  // Output paths for Capacitor iOS project
  const outputDir = path.join(__dirname, '..', 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset');
  const iosIconPath = path.join(outputDir, 'AppIcon-512@2x.png');

  // PWA icons in public folder
  const publicIconsDir = path.join(__dirname, '..', 'public', 'icons');

  // Ensure directories exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  if (!fs.existsSync(publicIconsDir)) {
    fs.mkdirSync(publicIconsDir, { recursive: true });
  }

  // Check if logo exists
  if (!fs.existsSync(logoPath)) {
    console.error('Logo not found at:', logoPath);
    console.log('Please place your logo PNG at assets/logo.png');
    process.exit(1);
  }

  console.log('Using logo from:', logoPath);

  // Generate icons using sharp
  try {
    const sharp = require('sharp');

    // Generate main iOS icon (1024x1024)
    await sharp(logoPath)
      .resize(1024, 1024)
      .png()
      .toFile(iosIconPath);
    console.log('iOS App icon (1024x1024) created at:', iosIconPath);

    // Generate PWA icons at various sizes
    const pwaIconSizes = [72, 96, 128, 144, 152, 192, 384, 512];
    for (const iconSize of pwaIconSizes) {
      const pwaIconPath = path.join(publicIconsDir, `icon-${iconSize}x${iconSize}.png`);
      await sharp(logoPath)
        .resize(iconSize, iconSize)
        .png()
        .toFile(pwaIconPath);
      console.log(`PWA icon (${iconSize}x${iconSize}) created at:`, pwaIconPath);
    }

    // Generate apple-touch-icon (180x180)
    const appleTouchIconPath = path.join(__dirname, '..', 'public', 'apple-touch-icon.png');
    await sharp(logoPath)
      .resize(180, 180)
      .png()
      .toFile(appleTouchIconPath);
    console.log('Apple touch icon (180x180) created at:', appleTouchIconPath);

    // Generate favicon (32x32)
    const faviconPath = path.join(__dirname, '..', 'public', 'favicon.png');
    await sharp(logoPath)
      .resize(32, 32)
      .png()
      .toFile(faviconPath);
    console.log('Favicon (32x32) created at:', faviconPath);

    // Generate favicon.ico (multi-size ICO)
    const favicon16Path = path.join(__dirname, '..', 'public', 'favicon-16x16.png');
    const favicon32Path = path.join(__dirname, '..', 'public', 'favicon-32x32.png');
    await sharp(logoPath).resize(16, 16).png().toFile(favicon16Path);
    await sharp(logoPath).resize(32, 32).png().toFile(favicon32Path);
    console.log('Favicon PNGs (16x16, 32x32) created');

    console.log('\nAll app icons generated successfully!');

  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND') {
      console.log('\nSharp module not found. Install it with: npm install sharp --save-dev');
    } else {
      console.error('Error generating icons:', e.message);
    }
    process.exit(1);
  }
}

generateIcon().catch(console.error);
