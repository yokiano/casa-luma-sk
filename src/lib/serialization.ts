/**
 * Generic DTO-to-POJO converter
 * 
 * Converts class instances (DTOs) with getters to plain JavaScript objects
 * for server/client serialization. Works with any DTO structure recursively.
 * 
 * @param value - Any value (DTO instance, plain object, array, primitive)
 * @returns Plain JavaScript object/array with no class instances
 */
export function toPojo(value: any): any {
	// Handle primitives and null
	if (value === null || value === undefined) return value;
	if (typeof value !== 'object') return value;

	// Handle arrays
	if (Array.isArray(value)) {
		return value.map(item => toPojo(item));
	}

	// Check if it's a plain object or class instance
	const result: any = {};
	const processedKeys = new Set<string>();

	// Collect instance properties
	Object.keys(value).forEach(key => {
		processedKeys.add(key);
		result[key] = toPojo((value as any)[key]);
	});

	// Collect getter properties from the prototype chain
	let proto = Object.getPrototypeOf(value);
	while (proto && proto !== Object.prototype) {
		Object.getOwnPropertyNames(proto).forEach(key => {
			if (processedKeys.has(key) || key === 'constructor') return;

			const descriptor = Object.getOwnPropertyDescriptor(proto, key);
			// Only extract getters, not methods
			if (descriptor?.get && !descriptor.set) {
				try {
					const val = (value as any)[key];
					result[key] = toPojo(val);
					processedKeys.add(key);
					if (key === 'pointOfContact' || key === 'jobPost') {
						console.log(`[toPojo] Extracted ${key}:`, val);
					}
				} catch (e) {
					// Skip getters that throw errors
					if (key === 'pointOfContact') {
						console.error(`[toPojo] Error extracting pointOfContact:`, e);
					}
				}
			}
		});
		proto = Object.getPrototypeOf(proto);
	}

	return result;
}
