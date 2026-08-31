import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FixtureSuperChatHost } from "../../../adapters/FixtureSuperChatHost";
import { SuperChatApp } from "../SuperChatApp";

describe("SuperChatApp", () => {
  it("mounts the shared UI from a neutral fixture host", async () => {
    const host = new FixtureSuperChatHost();

    render(<SuperChatApp host={host} />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Fixture User's Chat" })).toBeInTheDocument();
    });
    expect(screen.getByText("Start a new conversation")).toBeInTheDocument();
  });
});
