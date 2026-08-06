import { defineConfig, presetUno, presetWebFonts, presetIcons } from 'unocss';

/**
 * Ergänzungen für den LVS-Teil. Wenn du schon eine uno.config.ts hast,
 * übernimm daraus nur `theme.colors.lvs`, die Fonts und die Shortcuts.
 */
export default defineConfig({
	presets: [
		presetUno(),
		presetIcons({ scale: 1.2 }),
		presetWebFonts({
			provider: 'bunny', // DSGVO-freundlicher als Google Fonts
			fonts: {
				// Schmale Grotesk für Stichworte und Funkrufnamen – liest sich
				// auf Distanz wie ein Einsatzblatt, nicht wie eine Marketingseite.
				display: [{ name: 'Barlow Condensed', weights: ['500', '600', '700'] }],
				body: [{ name: 'IBM Plex Sans', weights: ['400', '500', '600'] }],
				// Zeiten und Zähler laufen monospaced, damit nichts springt.
				zahl: [{ name: 'IBM Plex Mono', weights: ['400', '500', '600'] }]
			}
		})
	],

	theme: {
		colors: {
			lvs: {
				nacht: '#0B1014',
				stahl: '#16202A',
				kante: '#243342',
				eis: '#E6EDF2',
				grau: '#8A9AA8',
				rot: '#E30613', // DLRG-Rot
				gelb: '#FFDD00', // DLRG-Gelb
				wasser: '#0090D4',
				gruen: '#35B27A'
			}
		}
	},

	shortcuts: {
		// Alles, was angetippt wird, ist mindestens 56 px hoch – Handschuhe, Regen, Dunkelheit.
		'lvs-taste':
			'min-h-14 px-5 rounded-lg font-display font-600 text-lg uppercase tracking-wide ' +
			'flex items-center justify-center gap-2 transition-transform active:scale-97 ' +
			'focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2',
		'lvs-panel': 'bg-lvs-stahl border border-lvs-kante rounded-xl',
		'lvs-label': 'font-body text-xs uppercase tracking-widest text-lvs-grau',
		'lvs-zahl': 'font-zahl tabular-nums'
	}
});