import { NOTION_API_KEY } from '$env/static/private';

/**
 * Uploads a file from a URL to Notion's internal storage using external_url mode.
 * Notion will fetch the file from the provided URL and host it internally.
 * @param url The URL of the file to upload (e.g. from Replicate)
 * @param filename The name to give the file in Notion
 * @returns The Notion file object to be used in properties
 */
export async function uploadToNotion(url: string, filename: string) {
	// 1. Initiate the file upload with Notion using external_url mode
	const notionResponse = await fetch('https://api.notion.com/v1/file_uploads', {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${NOTION_API_KEY}`,
			'Content-Type': 'application/json',
			'Notion-Version': '2022-06-28'
		},
		body: JSON.stringify({
			mode: 'external_url',
			filename: filename,
			external_url: url
		})
	});

	if (!notionResponse.ok) {
		const errorText = await notionResponse.text();
		throw new Error(`Failed to initiate Notion file upload: ${errorText}`);
	}

	const { id: file_id } = await notionResponse.json();

	// 2. Poll for the status to be 'uploaded'
	// Notion needs time to fetch the file from the external URL
	let attempts = 0;
	const maxAttempts = 15;
	while (attempts < maxAttempts) {
		const statusResponse = await fetch(`https://api.notion.com/v1/file_uploads/${file_id}`, {
			headers: {
				'Authorization': `Bearer ${NOTION_API_KEY}`,
				'Notion-Version': '2022-06-28'
			}
		});

		if (!statusResponse.ok) {
			const errorText = await statusResponse.text();
			throw new Error(`Failed to check Notion file upload status: ${errorText}`);
		}

		const { status } = await statusResponse.json();

		if (status === 'uploaded') {
			break;
		}

		if (status === 'failed') {
			throw new Error('Notion file import failed');
		}

		// Wait 1 second before next poll
		await new Promise(r => setTimeout(r, 1000));
		attempts++;
	}

	if (attempts === maxAttempts) {
		throw new Error('Notion file upload timed out');
	}

	// 3. Return the file_upload object format expected by Notion properties
	return {
		type: 'file_upload',
		file_upload: {
			id: file_id
		},
		name: filename
	};
}

