import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { fileNames, brief } = await req.json()

    // Try AI SDK if available
    try {
      const { generateText } = await import("ai")
      const { openai } = await import("@ai-sdk/openai")

      const prompt = [
        "You are a creative assistant helping a creator improve a 4-option visual A/B test.",
        "Files:",
        Array.isArray(fileNames) && fileNames.length ? "- " + fileNames.join("\n- ") : "- (none provided)",
        "Task:",
        typeof brief === "string" && brief.length ? brief : "Provide 3 concise improvements.",
        "Return JSON array of 3 items with 'title' and 'rationale'. Keep titles short.",
      ].join("\n")

      const { text } = await generateText({
        model: openai("gpt-4o"),
        prompt,
      })

      // attempt to parse JSON from model; if it isn't valid, fall back below
      const suggestions = JSON.parse(text)
      if (Array.isArray(suggestions) && suggestions.length) {
        return NextResponse.json({ suggestions })
      }
    } catch (e) {
      // swallow and continue to fallback
    }

    // Fallback suggestions if AI provider not configured or parsing failed
    return NextResponse.json({
      suggestions: [
        {
          title: "Clarify focal point",
          rationale: "Emphasize one subject per visual so voters notice differences immediately.",
        },
        {
          title: "Consistent framing",
          rationale: "Use similar crops and angles to isolate the variable you want to test.",
        },
        {
          title: "Readable typography",
          rationale: "Ensure headline text meets contrast and size accessibility guidelines.",
        },
      ],
    })
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 })
  }
}
