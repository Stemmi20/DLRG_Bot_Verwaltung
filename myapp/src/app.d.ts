// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			/** Aus der geprüften Sitzung, gesetzt in hooks.server.ts. */
			user: {
				id: string;
				vorname: string;
				nachname: string;
				ortsgruppe: string;
				istAdmin: boolean;
			} | null;
			userId: string | null;
			telegramID?: number;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}
export {};