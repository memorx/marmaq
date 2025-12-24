#!/usr/bin/env node
/**
 * Script para generar iconos PWA desde el SVG base
 * Requiere: npm install sharp
 * Ejecutar: node scripts/generate-icons.js
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, '../public/icons');
const svgPath = path.join(iconsDir, 'icon.svg');

async function generateIcons() {
  // Verificar que el SVG existe
  if (!fs.existsSync(svgPath)) {
    console.error('Error: icon.svg no encontrado en public/icons/');
    process.exit(1);
  }

  console.log('Generando iconos PWA...');

  for (const size of sizes) {
    const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);

    try {
      await sharp(svgPath)
        .resize(size, size)
        .png()
        .toFile(outputPath);

      console.log(`  ✓ icon-${size}x${size}.png`);
    } catch (error) {
      console.error(`  ✗ Error generando icon-${size}x${size}.png:`, error.message);
    }
  }

  // Generar iconos de shortcuts
  const shortcutIcons = [
    { name: 'shortcut-new.png', color: '#D57828' },
    { name: 'shortcut-dashboard.png', color: '#31A7D4' },
  ];

  console.log('\\nGenerando iconos de shortcuts...');

  for (const { name } of shortcutIcons) {
    const outputPath = path.join(iconsDir, name);
    try {
      await sharp(svgPath)
        .resize(96, 96)
        .png()
        .toFile(outputPath);

      console.log(`  ✓ ${name}`);
    } catch (error) {
      console.error(`  ✗ Error generando ${name}:`, error.message);
    }
  }

  console.log('\\n¡Iconos generados exitosamente!');
}

generateIcons().catch(console.error);
