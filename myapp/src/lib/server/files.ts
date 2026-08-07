// src/lib/server/files.ts
import { GridFSBucket, ObjectId } from 'mongodb';
import { db } from './database';

const bucket = new GridFSBucket(db, { bucketName: 'fuehrerscheine' });

export interface DateiMetadaten {
	zweck: string;
	[key: string]: unknown;
}

export async function saveFuehrerschein(
	file: File,
	metadata: DateiMetadaten
): Promise<ObjectId> {
	const buffer = Buffer.from(await file.arrayBuffer());

	const stream = bucket.openUploadStream(file.name, {
		contentType: file.type,
		metadata: { ...metadata, hochgeladenAm: new Date() }
	});

	return new Promise((resolve, reject) => {
		stream.on('error', reject);
		stream.on('finish', () => resolve(stream.id));
		stream.end(buffer);
	});
}

export async function deleteFuehrerschein(id: ObjectId): Promise<void> {
	await bucket.delete(id);
}

export async function readFuehrerschein(
	id: ObjectId
): Promise<{ buffer: Buffer; contentType: string; dateiname: string }> {
	const [datei] = await bucket.find({ _id: id }).limit(1).toArray();
	if (!datei) throw new Error('Datei nicht gefunden');

	const chunks: Buffer[] = [];
	for await (const chunk of bucket.openDownloadStream(id)) {
		chunks.push(chunk as Buffer);
	}

	return {
		buffer: Buffer.concat(chunks),
		contentType: datei.contentType ?? 'application/octet-stream',
		dateiname: datei.filename
	};
}