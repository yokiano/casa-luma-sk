import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const payload = await request.json();
        console.log('--- Customer Webhook Received ---');
        console.log(JSON.stringify(payload, null, 2));
        console.log('---------------------------------');

        // Loyverse expects a 2xx response to confirm receipt
        return json({ received: true });
    } catch (err) {
        console.error('Error processing webhook:', err);
        // Even if processing fails, we might want to return 200 to stop retries if the payload is bad,
        // but for now let's return 400 for bad JSON.
        return json({ error: 'Invalid request body' }, { status: 400 });
    }
};
