// src/lib/types/mitglied.ts
//
// Zentrale Feldlisten. Formular und Server-Action lesen beide von hier,
// damit ein neues Ausruestungsteil nur an einer Stelle ergaenzt werden muss.

export const AUSRUESTUNG = [
	{ key: 'neoprenSchuh', label: 'Neopren Schuhe' },
	{ key: 'schildmütze', label: 'Schildmütze' },
	{ key: 'jacke', label: 'Jacke' },
	{ key: 'badebekleidung', label: 'Badebekleidung' },
	{ key: 'pullover', label: 'Pullover' },
	{ key: 'hose', label: 'Hose' },
	{ key: 'namensschild', label: 'Namensschild' },
	{ key: 'TShirt', label: 'T-Shirt' },
	{ key: 'schuhe', label: 'Schuhe' },
	{ key: 'neoprenAnzug', label: 'Neopren Anzug' },
	{ key: 'handschuhe', label: 'Handschuhe' },
	{ key: 'neoprenHandschuhe', label: 'Neopren Handschuhe' },
	{ key: 'prallschutz', label: 'Prallschutz' }
] as const;

export const FUNKTIONEN = [
	{ key: 'evd', label: 'EVD (Einsatzleiter vom Dienst)' },
	{ key: 'bf', label: 'BF (Bootsführer)' },
	{ key: 'kf', label: 'KF (Kraftfahrer)' },
	{ key: 'wr', label: 'WR (Wasserretter)' },
	{ key: 'zf', label: 'ZF (Zugführer)' },
	{ key: 'et', label: 'ET (Einsatztaucher)' },
	{ key: 'sr', label: 'SR (Strömungsretter)' },
	{ key: 'gf', label: 'GF (Gruppenführer)' }
] as const;

export const STAMMDATEN = [
	{ key: 'vorname', label: 'Vorname' },
	{ key: 'nachname', label: 'Nachname' },
	{ key: 'benutzername', label: 'Benutzername' },
	{ key: 'ortsgruppe', label: 'Ortsgruppe' },
	{ key: 'zweitOrtsgruppe', label: 'Zweite Ortsgruppe' }
] as const;

export interface Mitglied {
	_id: string;
	telegramID?: number;
	vorname?: string;
	nachname?: string;
	benutzername?: string;
	ortsgruppe?: string;
	zweitOrtsgruppe?: string;
	ortsgruppe_admin?: boolean;
	status?: string;
	ausruestung?: Record<string, string>;
	funktionen?: Record<string, boolean>;
	user?: { ignored?: boolean; zugriff?: boolean; bekannt?: boolean; aktiv?: boolean };
}