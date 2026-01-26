import dotenv from 'dotenv';

dotenv.config();

const LOYVERSE_ACCESS_TOKEN = process.env.LOYVERSE_ACCESS_TOKEN;
const BASE_URL = 'https://api.loyverse.com/v1.0';

async function main() {
  if (!LOYVERSE_ACCESS_TOKEN) {
    console.error('LOYVERSE_ACCESS_TOKEN not found in .env');
    return;
  }

  try {
    console.log('Fetching customers from Loyverse...');
    const url = `${BASE_URL}/customers?limit=100`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${LOYVERSE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Loyverse API Error (${response.status}): ${await response.text()}`);
    }

    const data: any = await response.json();
    const customers = data.customers || [];
    
    // Sort by created_at descending
    const sortedCustomers = customers
      .filter((c: any) => c.created_at)
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const last5 = sortedCustomers.slice(0, 5);

    console.log('\nLast 5 Created Customers:');
    console.log('-------------------------');
    last5.forEach((c: any, i: number) => {
      console.log(`${i + 1}. Name: ${c.name}`);
      console.log(`   Customer Code: ${c.customer_code || 'N/A'}`);
      console.log(`   Created At: ${c.created_at}`);
      console.log(`   Note: ${c.note || 'None'}`);
      console.log('-------------------------');
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
