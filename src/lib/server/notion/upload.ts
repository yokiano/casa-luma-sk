import { NOTION_API_KEY } from '$env/static/private';

/**
 * Uploads a file from a URL to Notion's internal storage using single_part mode.
 * We fetch the file ourselves and push it to Notion's signed upload URL.
 * @param url The URL of the file to upload (e.g. from Replicate)
 * @param filename The name to give the file in Notion
 * @returns The Notion file object to be used in properties
 */
export async function uploadToNotion(url: string, filename: string) {
	// 1. Fetch the binary data from the source URL
	const sourceResponse = await fetch(url);
	if (!sourceResponse.ok) {
		throw new Error(`Failed to fetch file from source: ${sourceResponse.statusText}`);
	}
	const blob = await sourceResponse.blob();
	const contentType = blob.type || 'image/png';
	const contentLength = blob.size;

	// 2. Initiate the file upload with Notion using single_part mode
	const notionResponse = await fetch('https://api.notion.com/v1/file_uploads', {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${NOTION_API_KEY}`,
			'Content-Type': 'application/json',
			'Notion-Version': '2022-06-28'
		},
		body: JSON.stringify({
			mode: 'single_part',
			filename: filename,
			content_type: contentType,
			content_length: contentLength
		})
	});

	if (!notionResponse.ok) {
		const errorText = await notionResponse.text();
		throw new Error(`Failed to initiate Notion file upload: ${errorText}`);
	}

	const { id: file_id, upload_url } = await notionResponse.json();

	// 3. Upload the binary data to the signed URL provided by Notion
	const uploadResult = await fetch(upload_url, {
		method: 'PUT',
		headers: {
			'Content-Type': contentType
		},
		body: blob
	});

	if (!uploadResult.ok) {
		const errorText = await uploadResult.text();
		throw new Error(`Failed to upload file content to Notion storage: ${errorText}`);
	}

	// 4. Poll for the status to be 'uploaded' to ensure it's ready
	let attempts = 0;
	const maxAttempts = 10;
	while (attempts < maxAttempts) {
		const statusResponse = await fetch(`https://api.notion.com/v1/file_uploads/${file_id}`, {
			headers: {
				'Authorization': `Bearer ${NOTION_API_KEY}`,
				'Notion-Version': '2022-06-28'
			}
		});

		if (statusResponse.ok) {
			const { status } = await statusResponse.json();
			if (status === 'uploaded') break;
			if (status === 'failed') throw new Error('Notion file processing failed');
		}

		await new Promise(r => setTimeout(r, 500));
		attempts++;
	}

	// 5. Return the file_upload object format expected by Notion properties
	return {
		type: 'file_upload',
		file_upload: {
			id: file_id
		},
		name: filename
	};
}

