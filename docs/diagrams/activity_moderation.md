flowchart TD
  Start([Start]) --> receive["Receive content for moderation"]
  receive --> analyze["Analyze with AI (PhoBERT)"]
  analyze --> decision{"Risk level?"}
  decision -->|High| block["Auto block content"]
  decision -->|Medium| pending["Flag as pending (manual review)"]
  decision -->|Low| approve["Approve content (publish)"]
  pending --> moderator["Moderator reviews"]
  moderator -->|Approve| approve
  moderator -->|Reject| block
  block --> notifyUser["Notify user & log moderation action"]
  approve --> publish["Publish content"]
  publish --> End([End])
  notifyUser --> End
