import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const questions = [
		{
			id: 'q1',
			question: 'When a guest arrives claiming they have an active Membership or Flexi Pass, when should you check them in?',
			options: [
				{ id: 'A', text: 'Immediately upon arrival—ring up their 0-baht check-in item, attach their customer profile, and close/pay the ticket before they go play.' },
				{ id: 'B', text: 'When they are leaving the facility along with any food/beverage tabs they opened.' },
				{ id: 'C', text: 'Only if the facility is busy to save time; otherwise, write their name on a piece of paper.' },
				{ id: 'D', text: 'After they have finished playing, but before they order any dessert.' }
			],
			correctOption: 'A',
			explanation: 'Always check in members and flexi guests the moment they walk in. Ring up their 0-baht entry item, attach their customer profile, and close & pay that ticket immediately. We want to catch any expiration or balance issues while they are still at the front desk, not after they have already played.'
		},
		{
			id: 'q2',
			question: 'For which transactions in Loyverse must you attach a Customer Profile?',
			options: [
				{ id: 'A', text: 'Only when selling memberships or flexi passes.' },
				{ id: 'B', text: 'Every single ticket you close (including open play, memberships, flexi entries, and cafe orders).' },
				{ id: 'C', text: 'Only when the customer asks for loyalty points.' },
				{ id: 'D', text: 'Only when a manager is on-shift to watch.' }
			],
			correctOption: 'B',
			explanation: 'Always attach the customer to the ticket. This is how the system links the visit to the family for loyalty, restaurant history, and membership/flexi tracking. If they are not registered yet, have them scan the registration QR code first.'
		},
		{
			id: 'q3',
			question: 'When you sell a Weekly or Monthly Membership on Loyverse, what manual steps are required in Notion?',
			options: [
				{ id: 'A', text: 'You must manually create a record in the memberships database and calculate the valid-until date.' },
				{ id: 'B', text: 'You must write the family name on a physical index card.' },
				{ id: 'C', text: 'Zero manual steps. The membership record is created and dates calculated automatically once the ticket closes.' },
				{ id: 'D', text: 'You must use a calculator to count 30 days and email the manager.' }
			],
			correctOption: 'C',
			explanation: 'Selling a membership or flexi card and closing the ticket creates the record in our system automatically with the correct validity period. You do not need to log anything in Notion by hand—just attach the customer to the ticket.'
		},
		{
			id: 'q4',
			question: 'A family arrives and claims they have an active Weekly/Monthly membership, but the Svelte/Notion system shows it as expired or missing. What should you do?',
			options: [
				{ id: 'A', text: 'Let them in anyway to keep them happy, and check their profile later.' },
				{ id: 'B', text: 'Do not give a free entry under any circumstances — call a manager immediately.' },
				{ id: 'C', text: 'Ask them to pay a discounted rate of 100 baht.' },
				{ id: 'D', text: 'Tell them to come back tomorrow when the system might update.' }
			],
			correctOption: 'B',
			explanation: 'Never give a free entry for missing or expired memberships. Call a manager. If the system says it is expired or missing, escalate to the manager on shift to resolve.'
		},
		{
			id: 'q5',
			question: 'How do Flexi Pass punches and validity work?',
			options: [
				{ id: 'A', text: '11 entrances, 1 punch per hour covering all kids in the family for that hour, valid for 60 days (set automatically).' },
				{ id: 'B', text: '10 entrances, 1 punch per kid per hour, valid for 30 days (must be calculated manually).' },
				{ id: 'C', text: 'Infinite entrances, but only valid on weekdays between 9 AM and 12 PM.' },
				{ id: 'D', text: '12 entrances, 1 punch per family per visit, valid forever.' }
			],
			correctOption: 'A',
			explanation: 'Each flexi card gives 11 entrances. It uses 1 punch per hour, and that punch covers all the kids in the same family for that hour of play. Validity is 60 days and is tracked automatically by the system once the sale is completed with the customer profile attached.'
		},
		{
			id: 'q6',
			question: 'A customer bought a 1-Hour Open Play item but stays longer. At what point does it convert to a 1-Day Open Play item?',
			options: [
				{ id: 'A', text: 'Exactly at 60 minutes.' },
				{ id: 'B', text: 'If they stay more than 1 hour and 15 minutes (after a 15-minute grace period).' },
				{ id: 'C', text: 'Only if they stay longer than 2 hours.' },
				{ id: 'D', text: 'At the end of the day when closing the shift.' }
			],
			correctOption: 'B',
			explanation: 'We offer a 15-minute grace period on the 1-Hour Open Play item. Up to 1 hour + 15 minutes is fine. Anything more than that converts to a full 1-Day ticket. If the customer is unhappy about this conversion, get manager approval.'
		},
		{
			id: 'q7',
			question: 'When can you apply a 100% discount or a total discount exceeding 400 Baht on a ticket?',
			options: [
				{ id: 'A', text: 'Whenever a regular customer asks for it.' },
				{ id: 'B', text: 'Only with explicit manager approval.' },
				{ id: 'C', text: 'Anytime, as long as you write a note on the ticket.' },
				{ id: 'D', text: 'Only during weekend peak hours.' }
			],
			correctOption: 'B',
			explanation: 'Do not apply a 100% discount, or a total discount over 400 Baht on a ticket, without manager approval. This is a strict operational threshold.'
		}
	];

	return {
		role: 'Cashier' as const,
		questions
	};
};
