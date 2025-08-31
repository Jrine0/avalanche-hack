import { listTasks } from "@/lib/tasks-store"

export async function GET() {
  try {
    const tasks = await listTasks()
    return Response.json({ tasks })
  } catch (e: any) {
    return Response.json({ error: e?.message || "Failed to load tasks" }, { status: 500 })
  }
}
