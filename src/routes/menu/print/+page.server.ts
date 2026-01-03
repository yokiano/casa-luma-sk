import { getMenuSummaryWithModifiers } from '$lib/menu.remote';
import { cleanName } from '$lib/utils';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const menu = await getMenuSummaryWithModifiers();

	// Clean all names in the menu structure
	menu.grandCategories.forEach((gc) => {
		gc.name = cleanName(gc.name);
		gc.sections.forEach((s) => {
			s.name = cleanName(s.name);
			if (s.intro) s.intro = cleanName(s.intro);
			s.modifiers?.forEach((m) => {
				m.name = cleanName(m.name);
				m.options.forEach((o) => (o.name = cleanName(o.name)));
			});
			s.items.forEach((i) => {
				i.name = cleanName(i.name);
				if (i.description) i.description = cleanName(i.description);
				i.modifiers?.forEach((m) => {
					m.name = cleanName(m.name);
					m.options.forEach((o) => {
						o.name = cleanName(o.name);
					});
				});
			});
		});
	});

	// Also clean the flat sections and modifiers if they exist
	menu.sections.forEach((s) => {
		s.name = cleanName(s.name);
		if (s.intro) s.intro = cleanName(s.intro);
		s.modifiers?.forEach((m) => {
			m.name = cleanName(m.name);
			m.options.forEach((o) => (o.name = cleanName(o.name)));
		});
	});

	menu.allModifiers?.forEach((m) => {
		m.name = cleanName(m.name);
		m.options.forEach((o) => {
			o.name = cleanName(o.name);
		});
	});

	return { menu };
};
