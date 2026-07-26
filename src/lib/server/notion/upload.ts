import { NOTION_API_KEY } from '$env/static/private';

export type NotionFileUpload = {
	type: 'file_upload';
	file_upload: { id: string };
	name: string;
};

const notionFetch = (input: string, init: RequestInit = {}, timeoutMs = 30_000) =>
	fetch(input, { ...init, signal: AbortSignal.timeout(timeoutMs) });

/** Uploads already-validated binary data to Notion's internal storage. */
export async function uploadBlobToNotion(blob: Blob, filename: string): Promise<NotionFileUpload> {
	const contentType = blob.type || 'application/octet-stream';
	const contentLength = blob.size;
	if (!contentLength) throw new Error('Cannot upload an empty file to Notion.');

	const notionResponse = await notionFetch('https://api.notion.com/v1/file_uploads', {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${NOTION_API_KEY}`,
			'Content-Type': 'application/json',
			'Notion-Version': '2025-09-03'
		},
		body: JSON.stringify({
			mode: 'single_part',
			filename,
			content_type: contentType,
			content_length: contentLength
		})
	});

	if (!notionResponse.ok) {
		throw new Error(`Failed to initiate Notion file upload (HTTP ${notionResponse.status}).`);
	}

	const upload = await notionResponse.json() as { id?: unknown; upload_url?: unknown };
	if (typeof upload.id !== 'string' || typeof upload.upload_url !== 'string') {
		throw new Error('Notion returned an invalid file-upload response.');
	}

	const formData = new FormData();
	formData.append('file', blob, filename);

	const uploadResult = await notionFetch(upload.upload_url, {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${NOTION_API_KEY}`,
			'Notion-Version': '2025-09-03'
		},
		body: formData
	});

	if (!uploadResult.ok) {
		throw new Error(`Failed to upload file content to Notion (HTTP ${uploadResult.status}).`);
	}

	let attempts = 0;
	const maxAttempts = 15;
	while (attempts < maxAttempts) {
		const statusResponse = await notionFetch(`https://api.notion.com/v1/file_uploads/${upload.id}`, {
			headers: {
				'Authorization': `Bearer ${NOTION_API_KEY}`,
				'Notion-Version': '2025-09-03'
			}
		}, 10_000);

		if (statusResponse.ok) {
			const { status } = await statusResponse.json() as { status?: string };
			if (status === 'uploaded') break;
			if (status === 'failed') throw new Error('Notion file processing failed.');
		}

		await new Promise((resolve) => setTimeout(resolve, 1000));
		attempts++;
	}

	if (attempts >= maxAttempts) {
		throw new Error('Timed out waiting for Notion to process the file.');
	}

	return {
		type: 'file_upload',
		file_upload: { id: upload.id },
		name: filename
	};
}

/**
 * Fetches a file from a URL, then uploads it to Notion's internal storage.
 * Callers handling authenticated or sensitive source URLs should download and
 * validate the bytes themselves, then call uploadBlobToNotion instead.
 */
export async function uploadToNotion(url: string, filename: string): Promise<NotionFileUpload> {
	const sourceResponse = await notionFetch(url);
	if (!sourceResponse.ok) {
		throw new Error(`Failed to fetch file from source (HTTP ${sourceResponse.status}).`);
	}
	return uploadBlobToNotion(await sourceResponse.blob(), filename);
}
