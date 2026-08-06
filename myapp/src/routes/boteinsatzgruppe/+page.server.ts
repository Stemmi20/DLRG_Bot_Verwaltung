import { collection } from '$lib/server/usedata';
import { ObjectId } from 'mongodb';
import { error } from '@sveltejs/kit';
import type { Actions } from './$types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async function () {
    try {
        const data = await collection.find({}).toArray();
        const serializedData = data.map(item => ({
            ...item,
            _id: item._id.toString(),
        }));
        console.log('Loaded data from User collection:', serializedData);
        return { data: serializedData };
    } catch (error) {
        console.error('Error loading data:', error);
        return { data: [] };
    }
}
