import { error } from '@sveltejs/kit';
import { board } from '$lib/server/alarm';
import { ladeUser, darfBoardSehen } from '$lib/server/guards';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = await ladeUser(locals);
	const daten = await board(params.id);

	return {
		board: daten,
		darfSteuern: darfBoardSehen(user)
	};
};
