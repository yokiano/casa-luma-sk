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
			'Notion-Version': '2025-09-03'
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
	console.log(`Notion upload initiated. ID: ${file_id}`);

	// 3. Upload the binary data using multipart/form-data
	const formData = new FormData();
	formData.append('file', blob, filename);

	const uploadResult = await fetch(upload_url, {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${NOTION_API_KEY}`,
			'Notion-Version': '2025-09-03'
		},
		body: formData
	});

	if (!uploadResult.ok) {
		const errorText = await uploadResult.text();
		console.error(`Notion upload failed: ${errorText}`);
		throw new Error(`Failed to upload file content to Notion storage: ${errorText}`);
	}
	console.log(`Notion file content sent. Polling for status...`);

	// 4. Poll for the status to be 'uploaded' to ensure it's ready
	let attempts = 0;
	const maxAttempts = 15;
	while (attempts < maxAttempts) {
		const statusResponse = await fetch(`https://api.notion.com/v1/file_uploads/${file_id}`, {
			headers: {
				'Authorization': `Bearer ${NOTION_API_KEY}`,
				'Notion-Version': '2025-09-03'
			}
		});

		if (statusResponse.ok) {
			const { status } = await statusResponse.json();
			if (status === 'uploaded') break;
			if (status === 'failed') throw new Error('Notion file processing failed');
		}

		await new Promise(r => setTimeout(r, 1000));
		attempts++;
	}

	if (attempts >= maxAttempts) {
		throw new Error('Timed out waiting for Notion to process the file');
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

