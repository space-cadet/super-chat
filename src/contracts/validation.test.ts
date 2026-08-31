import { describe, expect, it } from "vitest";
import type { SuperChatHost } from "./host";
import {
	assertHostContract,
	getHostCapability,
	hasHostCapability,
	listHostCapabilities,
	validateHostContract,
} from "./validation";

function createHost(): SuperChatHost {
	return {
		id: "fixture",
		name: "Fixture Host",
		capabilities: {
			identity: {
				id: "fixture.identity",
				kind: "identity",
				getIdentity: async () => ({ id: "user-1", displayName: "Fixture" }),
			},
			persistence: {
				id: "fixture.persistence",
				kind: "persistence",
				schemaVersion: 1,
				loadSessions: async () => [],
				saveSession: async () => undefined,
				deleteSession: async () => undefined,
				archiveSession: async () => undefined,
			},
		},
	};
}

describe("SuperChatHost contract helpers", () => {
	it("accepts a valid host and reports its capabilities", () => {
		const report = validateHostContract(createHost());
		expect(report).toEqual({
			valid: true,
			capabilityKinds: ["identity", "persistence"],
			issues: [],
		});
	});

	it("supports optional capability discovery", () => {
		const host = createHost();
		expect(hasHostCapability(host, "identity")).toBe(true);
		expect(hasHostCapability(host, "retrieval")).toBe(false);
		expect(getHostCapability(host, "persistence")?.schemaVersion).toBe(1);
		expect(listHostCapabilities(host).map(({ kind }) => kind)).toEqual([
			"identity",
			"persistence",
		]);
	});

	it("allows a minimal host with no optional capabilities", () => {
		const host: SuperChatHost = {
			id: "minimal",
			name: "Minimal Host",
			capabilities: {},
		};
		expect(validateHostContract(host).valid).toBe(true);
	});

	it("rejects empty host and capability ids", () => {
		const host = createHost();
		host.id = " ";
		host.capabilities.identity!.id = "";
		const report = validateHostContract(host);
		expect(report.valid).toBe(false);
		expect(report.issues.map(({ path }) => path)).toEqual(
			expect.arrayContaining(["id", "capabilities.identity.id"]),
		);
	});

	it("rejects duplicate capability ids", () => {
		const host = createHost();
		host.capabilities.persistence!.id = "fixture.identity";
		const report = validateHostContract(host);
		expect(report.valid).toBe(false);
		expect(report.issues).toContainEqual({
			path: "capabilities.persistence.id",
			message: 'Capability id "fixture.identity" is duplicated',
		});
	});

	it("throws an actionable error for an invalid host", () => {
		const host = createHost();
		host.name = "";
		expect(() => assertHostContract(host)).toThrow(
			"Invalid SuperChatHost contract: name: Host name must not be empty",
		);
	});
});

