import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AIChatMessage } from "@/lib/ai-service";
import { MistakeExplanation } from "./MistakeExplanation";

const { streamChatMock } = vi.hoisted(() => ({ streamChatMock: vi.fn() }));

vi.mock("@/lib/ai-service", () => ({ streamChat: streamChatMock }));
vi.mock("@/hooks/useUserStorage", () => ({
  useUserStorage: () => [{}, vi.fn()],
}));
vi.mock("@/components/MathRenderer", () => ({
  default: ({ content }: { content: string }) => <div>{content}</div>,
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const question = {
  id: "question-with-diagram",
  subject: "physics" as const,
  year: 2020,
  type: "mcq" as const,
  topic: "Electricity",
  question: "What does this circuit diagram represent?",
  options: [
    { label: "A", text: "Series circuit" },
    { label: "B", text: "Parallel circuit" },
  ],
  correctAnswer: "B",
  explanation: "The branches share the same two nodes.",
  imageUrl: "https://cdn.example.org/questions/circuit.png",
};

describe("MistakeExplanation image context", () => {
  it("sends the question image as a real image attachment with the mistake context", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(new TextEncoder().encode("circuit-data"), {
        status: 200,
        headers: { "content-type": "image/png" },
      }),
    ));
    streamChatMock.mockResolvedValue(undefined);

    render(
      <MistakeExplanation
        subject="Physics"
        topicName="Electricity"
        question={question}
        selectedAnswer="A"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Explain my mistake/i }));

    await waitFor(() => expect(streamChatMock).toHaveBeenCalledTimes(1));
    const messages = streamChatMock.mock.calls[0][1] as AIChatMessage[];
    expect(messages[0].content).toContain("What does this circuit diagram represent?");
    expect(messages[0].content).toContain("The student chose: A");
    expect(messages[0].attachment).toMatchObject({
      mimeType: "image/png",
      name: "circuit.png",
    });
    expect(messages[0].attachment?.base64).toBe("Y2lyY3VpdC1kYXRh");
  });

  it("does not send a text-only request when the question image cannot be loaded", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    streamChatMock.mockResolvedValue(undefined);

    render(
      <MistakeExplanation
        subject="Physics"
        topicName="Electricity"
        question={question}
        selectedAnswer="A"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Explain my mistake/i }));

    expect(await screen.findByText(/No text-only explanation was sent/i)).toBeInTheDocument();
    expect(streamChatMock).not.toHaveBeenCalled();
  });
});
