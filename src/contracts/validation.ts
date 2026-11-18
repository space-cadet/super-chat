import type {
	HostCapability,
	HostCapabilityKind,
	SuperChatCapabilities,
	SuperChatHost,
} from "./host";

const capabilityDefinitions = [
	{ key: "identity", kind: "identity" },
	{ key: "providerProfiles", kind: "provider-profiles" },
	{ key: "persistence", kind: "persistence" },
	{ key: "credentials", kind: "credentials" },
	{ key: "tools", kind: "tools" },
	{ key: "retrieval", kind: "retrieval" },
	{ key: "documents", kind: "documents" },
	{ key: "navigation", kind: "navigation" },
	{ key: "notifications", kind: "notifications" },
	{ key: "lifecycle", kind: "lifecycle" },
] as const satisfies ReadonlyArray<{ key: keyof SuperChatCapabilities; kind: HostCapabilityKind }>;

type CapabilityKeyByKind = {
	[K in HostCapabilityKind]: Extract<(typeof capabilityDefinitions)[number], { kind: K }> extends { key: infer Key }
		? Extract<Key, keyof SuperChatCapabilities>
		: never;
};

export interface HostContractIssue {
	path: string;
	message: string;
}

export interface HostContractReport {
	valid: boolean;
	capabilityKinds: HostCapabilityKind[];
	issues: HostContractIssue[];
}

export function getHostCapability<K extends HostCapabilityKind>(
	host: SuperChatHost,
	kind: K,
): SuperChatCapabilities[CapabilityKeyByKind[K]] {
	const key = capabilityDefinitions.find((definition) => definition.kind === kind)?.key as CapabilityKeyByKind[K];
	return host.capabilities[key] as SuperChatCapabilities[CapabilityKeyByKind[K]];
}

export function hasHostCapability<K extends HostCapabilityKind>(
	host: SuperChatHost,
	kind: K,
): host is SuperChatHost & {
  capabilities: SuperChatCapabilities & Required<Pick<SuperChatCapabilities, CapabilityKeyByKind[K]>>;
} {
	const key = capabilityDefinitions.find((definition) => definition.kind === kind)?.key as CapabilityKeyByKind[K];
	return host.capabilities[key] !== undefined;
}

export function listHostCapabilities(host: SuperChatHost): HostCapability[] {
	return capabilityDefinitions.flatMap(({ key }) => {
		const capability = host.capabilities[key];
		return capability
			? Array.isArray(capability)
				? capability
				: [capability]
			: [];
	});
}

export function validateHostContract(host: SuperChatHost): HostContractReport {
	const issues: HostContractIssue[] = [];
	if (!host.id.trim()) {
		issues.push({ path: "id", message: "Host id must not be empty" });
	}
	if (!host.name.trim()) {
		issues.push({ path: "name", message: "Host name must not be empty" });
	}

	const capabilities = listHostCapabilities(host);
	const ids = new Set<string>();
	for (const capability of capabilities) {
		const path = `capabilities.${capability.kind}`;
		if (!capability.id.trim()) {
			issues.push({ path: `${path}.id`, message: "Capability id must not be empty" });
		}
		if (capability.kind !== findCapabilityKey(host, capability)) {
			issues.push({
				path: `${path}.kind`,
				message: "Capability kind must match its host capability key",
			});
		}
		if (ids.has(capability.id)) {
			issues.push({
				path: `${path}.id`,
				message: `Capability id "${capability.id}" is duplicated`,
			});
		}
		ids.add(capability.id);
	}

	return {
		valid: issues.length === 0,
		capabilityKinds: capabilities.map((capability) => capability.kind),
		issues,
	};
}

export function assertHostContract(host: SuperChatHost): void {
	const report = validateHostContract(host);
	if (report.valid) return;
	const detail = report.issues
		.map((issue) => `${issue.path}: ${issue.message}`)
		.join("; ");
	throw new Error(`Invalid SuperChatHost contract: ${detail}`);
}

function findCapabilityKey(
	host: SuperChatHost,
	capability: HostCapability,
): HostCapabilityKind | undefined {
	return capabilityDefinitions.find(
		({ key }) => {
			const candidate = host.capabilities[key];
			return Array.isArray(candidate)
				? candidate.some((item) => item === capability)
				: candidate === capability;
		},
	)?.kind;
}
