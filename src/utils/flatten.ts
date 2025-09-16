export function flattenObject(obj: Record<string, unknown>, prefix = ''): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(obj)) {
		const fullKey = prefix ? `${prefix}.${key}` : key;
		if (value && typeof value === 'object' && !Array.isArray(value)) {
			Object.assign(result, flattenObject(value as Record<string, unknown>, fullKey));
		} else {
			result[fullKey] = value;
		}
	}
	return result;
}


