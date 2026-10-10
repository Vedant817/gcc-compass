import { ChatThread } from "@/components/ask/ChatThread";

export const metadata = {
  title: "Ask the registry · GCC Compass",
};

export default function AskPage() {
  return (
    <>
      <h1>Ask the registry</h1>
      <p className="text-sm text-muted mb-5 max-w-2xl">
        Answers are written from the registry only. Every number must trace back to a cited fact or
        policy, or the answer is dropped server-side.
      </p>
      <div className="max-w-3xl">
        <ChatThread />
      </div>
    </>
  );
}
