import { EventEmitter } from 'node:events';
import type { EinsatzEvent } from '$lib/types/lvs';

const bus = new EventEmitter();
bus.setMaxListeners(0);

function kanal(einsatzId: string): string {
    return `einsatz:${einsatzId}`;
}

export function veroeffentliche(einsatzId: string, ereignis: EinsatzEvent): void {
    bus.emit(kanal(einsatzId), ereignis);
}

export function abonniere(einsatzId: string, hoerer: (e: EinsatzEvent) => void): () => void {
    bus.on(kanal(einsatzId), hoerer);
    return () => bus.off(kanal(einsatzId), hoerer);
}

export function anzahlHoerer(einsatzId: string): number {
    return bus.listenerCount(kanal(einsatzId));
}