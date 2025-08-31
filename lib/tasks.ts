export type Task = {
  id: string
  title: string
  options: { id: string; image: string; label: string }[]
}

export const demoTasks: Task[] = [
  {
    id: "task-1",
    title: "Select the best app icon",
    options: [
      { id: "1A", image: "/app-icon-variant-1.png", label: "Icon A" },
      { id: "1B", image: "/app-icon-variant-2.png", label: "Icon B" },
      { id: "1C", image: "/app-icon-variant-3.png", label: "Icon C" },
      { id: "1D", image: "/app-icon-variant-4.png", label: "Icon D" },
    ],
  },
  {
    id: "task-2",
    title: "Choose homepage hero visual",
    options: [
      { id: "2A", image: "/homepage-hero-concept-1.png", label: "Hero A" },
      { id: "2B", image: "/homepage-hero-concept-2.png", label: "Hero B" },
      { id: "2C", image: "/homepage-hero-concept-3.png", label: "Hero C" },
      { id: "2D", image: "/homepage-hero-concept-4.png", label: "Hero D" },
    ],
  },
  {
    id: "task-3",
    title: "Pick the ad thumbnail",
    options: [
      { id: "3A", image: "/ad-thumbnail-1.png", label: "Thumb A" },
      { id: "3B", image: "/ad-thumbnail-2.png", label: "Thumb B" },
      { id: "3C", image: "/ad-thumbnail-3.png", label: "Thumb C" },
      { id: "3D", image: "/ad-thumbnail-4.png", label: "Thumb D" },
    ],
  },
]
