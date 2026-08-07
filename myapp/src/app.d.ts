// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			user: {
				id: string;
				vorname: string;
				nachname: string;
				ortsgruppe: string;
				istAdmin: boolean;
			} | null;
			userId: string | null;
		}
	}
}
 
export {};