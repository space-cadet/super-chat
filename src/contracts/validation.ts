import type {
	HostCapability,
	HostCapabilityKind,
	SuperChatCapabilities,
	SuperChatHost,
} from "./host";

const capabilityKinds: HostCapabilityKind[] = [
	"identity",
	"persistence",
	"credentials",
	"tools",
	"retrieval",
	"documents",
	"navigation",
	"notifications",
	"lifecycle",
];

export interface HostContractIssue {
	path: string;
	message: string;
}

export interface HostContractReport {
	valid: boolean;
	capabilityKinds: HostCapabilityKind[];
	issues: HostContractIssue[];
}

export function getHostCapability<K extends keyof SuperChatCapabilities>(
	host: SuperChatHost,
	kind: K,
): SuperChatCapabilities[K] {
	return host.capabilities[kind];
}

export function hasHostCapability<K extends keyof SuperChatCapabilities>(
	host: SuperChatHost,
	kind: K,
): host is SuperChatHost & {
	capabilities: SuperChatCapabilities & Required<Pick<SuperChatCapabilities, K>>;
} {
	return host.capabilities[kind] !== undefined;
}

export function listHostCapabilities(host: SuperChatHost): HostCapability[] {
	return capabilityKinds.flatMap((kind) => {
		const capability = host.capabilities[kind];
		return capability ? [capability] : [];
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
	return capabilityKinds.find(
		(kind) => host.capabilities[kind] === capability,
	);
}

