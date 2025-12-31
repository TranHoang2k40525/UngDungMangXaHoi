usecaseDiagram
  actor User
  actor Admin
  actor AI as "AI Moderation System"
  actor Payment as "Payment Gateway"

  User --> (Register / Login)
  User --> (Create Post)
  User --> (Interact with Content)
  User --> (View Feed)
  Admin --> (Manage System)
  Admin --> (Moderate Content)
  AI --> (Moderate Content)
  Payment --> (Process Payment)

  (Create Post) .> (Moderate Content) : <<include>>
  (Process Payment) .> (Manage System) : <<include>>


