import { alleFahrzeuge, starteMqtt } from '$lib/server/mqtt';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// Beim ersten Aufruf die Broker-Verbindung aufbauen, danach ist sie da.
	starteMqtt();

	return { fahrzeuge: alleFahrzeuge() };
};