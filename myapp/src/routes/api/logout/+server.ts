import { json } from '@sveltejs/kit';
import { collection } from '$lib/server/usedata';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (req) => {
	const token = req.cookies.get('token');

	console.log('=== LOGOUT ===');
	console.log('Token:', token);

	if (token) {
		try {
			const user = await collection.findOne({ 'user.token': token } as any);

			if (user) {
				await collection.updateOne({ 'user._id': user.user._id } as any, {
					$unset: { 'user.token': '' },
				});

				console.log('✅ Token gelöscht für User:', user.user.vorname, user.user.nachname);
			}
		} catch (error) {
			console.error('❌ Fehler beim Löschen des Tokens:', error);
		}
	}

	req.cookies.delete('token', { path: '/' });
	req.cookies.delete('userid', { path: '/' });

	console.log('✅ Logout erfolgreich');
	console.log('==================\n');

	return json({ success: true });
};
