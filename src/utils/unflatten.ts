export function unflattenObject(flat: Record<string, unknown>): Record<string, unknown> {
	const root: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(flat)) {
		const parts = key.split('.');
		let cur: Record<string, unknown> = root;
		for (let i = 0; i < parts.length; i++) {
			const part = parts[i]!;
			if (i === parts.length - 1) {
				cur[part] = value;
			} else {
				if (typeof cur[part] !== 'object' || cur[part] === null || Array.isArray(cur[part])) cur[part] = {};
				cur = cur[part] as Record<string, unknown>;
			}
		}
	}
	return root;
}


