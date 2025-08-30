import { listTasks, getTask, type Task } from "@/lib/tasks-store"
import AudienceVote from "@/components/audience-vote"
import { GlassCard } from "@/components/glass-card"

export default async function AudiencePage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const taskId = typeof searchParams?.task === "string" ? searchParams.task : undefined
  let task: Task | undefined
  if (taskId) {
    task = await getTask(taskId)
  }
  const tasks = await listTasks()
  const show = task || tasks[0]

  // compute next task id for "Next" flow
  const currentIndex = show ? tasks.findIndex((t) => t.id === show.id) : -1
  const nextTaskId = show && tasks.length > 1 ? tasks[(currentIndex + 1) % tasks.length]?.id : undefined

  return (
    <main className="min-h-screen px-4 py-10 md:py-16">
      <div className="mx-auto max-w-4xl animate-page-in">
        <header className="mb-6">
          <h1 className="text-2xl md:text-3xl font-semibold text-balance">Audience Dashboard</h1>
          <p className="text-foreground/80 mt-2">Connect wallet, review thumbnails, and vote to earn rewards.</p>
        </header>

        {show ? (
          <>
            <AudienceVote task={show} nextTaskId={nextTaskId} />
          </>
        ) : (
          <GlassCard>
            <p className="text-foreground/80">
              No tasks available yet. Check back soon or ask a creator to publish one.
            </p>
          </GlassCard>
        )}

        <section className="mt-8">
          <h2 className="text-lg font-medium mb-3">Other Tasks</h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {tasks.slice(0, 6).map((t) => (
              <li key={t.id} className="glass rounded-md hover-lift">
                <a href={`/audience?task=${t.id}`} className="block p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-foreground">{t.title}</div>
                      <div className="text-xs text-foreground/70">{t.rewardPoolAvax} AVAX pool</div>
                    </div>
                    <div className="flex -space-x-2">
                      {t.images.slice(0, 3).map((img, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={i}
                          src={img.src || "/placeholder.svg?height=32&width=32&query=thumbnail%20preview"}
                          alt={img.alt || `Option ${i + 1}`}
                          className="w-8 h-8 rounded object-cover border border-border"
                        />
                      ))}
                    </div>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  )
}
