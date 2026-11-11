import type Phaser from 'phaser';

/** Single source of truth for DOM and canvas typography. Latin variable WOFF2s
 * contain every requested weight; see public/assets/fonts/*-OFL.txt. */
export const typography = {
  families: { heading: 'Cinzel', ui: 'Exo 2', code: 'JetBrains Mono' },
  sizes: {
    label: 14, ui: 16, body: 18, code: 16, subheading: 22,
    heading: 30, headingSmall: 24, title: 64, titleSmall: 32, titleMedium: 48,
    icon: 24, ornament: 42, achievement: 56, worldSymbol: 75,
  },
  weights: { regular: 400, medium: 500, semibold: 600, bold: 700 },
  lines: { body: 1.5, heading: 1.25, title: 1.15 },
  tracking: { body: 'normal', label: '.025em', heading: '.01em' },
} as const;

export const fontAssets = [
  { family: typography.families.heading, file: 'cinzel', range: '400 900', weights: [600, 700] },
  { family: typography.families.ui, file: 'exo-2', range: '100 900', weights: [400, 500, 600] },
  { family: typography.families.code, file: 'jetbrains-mono', range: '100 800', weights: [400, 500] },
] as const;

export function applyTypographyTokens(): void {
  const style = document.documentElement.style;
  for (const [role, family] of Object.entries(typography.families)) {
    style.setProperty(`--font-${role}`, `"${family}", ${role === 'heading' ? 'serif' : role === 'code' ? 'monospace' : 'sans-serif'}`);
  }
  for (const [key, value] of Object.entries(typography.sizes)) style.setProperty(`--text-${key}`, `${value}px`);
  for (const [key, value] of Object.entries(typography.weights)) style.setProperty(`--weight-${key}`, String(value));
  for (const [key, value] of Object.entries(typography.lines)) style.setProperty(`--line-${key}`, String(value));
  for (const [key, value] of Object.entries(typography.tracking)) style.setProperty(`--tracking-${key}`, value);
}

export async function loadTypography(): Promise<void> {
  // Register actual variable faces, then explicitly request all seven weights.
  // No Phaser.Game (including Boot's loading text) is constructed until this resolves.
  await Promise.all(fontAssets.map(async asset => {
    const face = new FontFace(asset.family, `url("${import.meta.env.BASE_URL}assets/fonts/${asset.file}-latin-variable.woff2") format("woff2")`, {
      weight: asset.range, style: 'normal', display: 'swap',
    });
    document.fonts.add(face);
    await face.load();
    for (const weight of asset.weights) {
      const loaded = await document.fonts.load(`${weight} ${typography.sizes.body}px "${asset.family}"`, 'Forest 0123');
      if (!loaded.length) throw new Error(`Font weight unavailable: ${asset.family} ${weight}`);
    }
  }));
  await document.fonts.ready;
}

type CanvasRole = 'label' | 'code' | 'symbol';
/** Keep world labels >=14 CSS pixels even when the 720px world is scaled down.
 * Reflow existing text on resize; never scale or mutate physics geometry. */
export function canvasText(
  scene: Phaser.Scene, x: number, y: number, text: string,
  role: CanvasRole, color: string, maxWidth = 240,
): Phaser.GameObjects.Text {
  const size = role === 'label' ? typography.sizes.label : role === 'code' ? typography.sizes.subheading : typography.sizes.worldSymbol;
  const family = role === 'code' ? typography.families.code : typography.families.ui;
  const weight = role === 'label' ? typography.weights.medium : typography.weights.regular;
  const label = scene.add.text(x, y, text, {
    // Canvas CSS font syntax requires quotes for names containing a numeric word (Exo 2).
    fontFamily: `"${family}"`, fontStyle: String(weight), fontSize: size,
    color, align: 'center', resolution: Math.min(window.devicePixelRatio || 1, 2),
    padding: { top: 3, bottom: 3, left: 6, right: 6 },
  });
  if(role==='label'){
    label.setBackgroundColor('rgba(5,14,19,0.30)').setColor('#f5f2e9');
    label.setStroke('#07131b',2).setShadow(0,2,'rgba(0,0,0,0.8)',2,false,true);
  }
  const resize = () => {
    const cssScale = scene.scale.displaySize.width / scene.scale.gameSize.width;
    const readableSize = Math.ceil(size / Math.min(1, cssScale || 1));
    label.setFontSize(readableSize);
    label.setLineSpacing(readableSize * (typography.lines.heading - 1));
    if (role === 'label') label.setWordWrapWidth(Math.min(maxWidth, scene.scale.width - 32), true);
  };
  resize();
  scene.scale.on('resize', resize);
  label.once('destroy', () => scene.scale.off('resize', resize));
  return label;
}
