// Simple in-memory store for demo purposes (non-persistent)
// In production, replace with a database or contract-backed persistence.
"use server"

export type TaskImage = {
  src: string // Data URL or public URL
  alt?: string
  mime?: string
  name?: string
}

export type Vote = {
  walletAddress: string
  choiceIndex: number
  at: string
}

export type Task = {
  id: string
  title: string
  rewardPoolAvax: number
  images: TaskImage[]
  createdAt: string
  endsAt?: string
  votes: Vote[]
}

const tasks: Task[] = [
  {
    id: "demo-1",
    title: "Best Travel Vlog Thumbnail",
    rewardPoolAvax: 5,
    images: [
      { src: "/travel-vlog-thumbnail-option-1.png", alt: "Option 1" },
      { src: "/travel-vlog-thumbnail-option-2.png", alt: "Option 2" },
      { src: "/travel-vlog-thumbnail-option-3.png", alt: "Option 3" },
      { src: "/travel-vlog-thumbnail-option-4.png", alt: "Option 4" },
    ],
    createdAt: new Date().toISOString(),
    votes: [],
  },
]

// Utilities
function uid() {
  return Math.random().toString(36).slice(2, 10)
}

export async function listTasks(): Promise<Task[]> {
  // Return newest first
  return [...tasks].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export async function getTask(id: string): Promise<Task | undefined> {
  return tasks.find((t) => t.id === id)
}

export async function createTask(input: {
  title: string
  rewardPoolAvax: number
  images: TaskImage[]
  endsAt?: string
}): Promise<Task> {
  if (!input.title || input.images.length < 1) {
    throw new Error("Title required and at least one option is required")
  }
  const t: Task = {
    id: uid(),
    title: input.title.trim(),
    rewardPoolAvax: input.rewardPoolAvax || 0,
    images: input.images,
    createdAt: new Date().toISOString(),
    endsAt: input.endsAt,
    votes: [],
  }
  tasks.unshift(t)
  return t
}

export async function submitVote(input: {
  taskId: string
  walletAddress: string
  choiceIndex: number
}): Promise<Task> {
  const task = tasks.find((t) => t.id === input.taskId)
  if (!task) throw new Error("Task not found")
  if (input.choiceIndex < 0 || input.choiceIndex >= task.images.length) {
    throw new Error("Choice index out of range")
  }
  // Prevent duplicate votes from same wallet (basic demo logic)
  const already = task.votes.find((v) => v.walletAddress.toLowerCase() === input.walletAddress.toLowerCase())
  if (already) {
    throw new Error("Wallet already voted on this task")
  }
  task.votes.push({
    walletAddress: input.walletAddress,
    choiceIndex: input.choiceIndex,
    at: new Date().toISOString(),
  })
  return task
}

export function computeResults(task: Task) {
  const imgLen = Array.isArray(task.images) ? task.images.length : 0
  const counts = Array.from({ length: Math.max(0, imgLen) }, () => 0)
  for (const v of task.votes) {
    if (v.choiceIndex >= 0 && v.choiceIndex < counts.length) {
      counts[v.choiceIndex]++
    }
  }
  const total = task.votes.length || 0
  const winnerIndex = counts.length ? counts.indexOf(Math.max(...counts)) : -1
  // Simple micro-reward calc: split pool evenly among all voters
  const perVoter = total > 0 ? task.rewardPoolAvax / total : 0
  return { counts, total, winnerIndex, perVoter }
}
