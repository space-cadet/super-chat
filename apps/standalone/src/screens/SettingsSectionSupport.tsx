export function UnavailableMark({ label = "Unavailable in this app" }: { label?: string }) {
	return (
		<span className="settings-unavailable-mark" role="img" aria-label={label} title={label}>
			×
		</span>
	);
}
